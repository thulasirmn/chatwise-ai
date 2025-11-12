import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) throw new Error(text || "Non-JSON error response");
    data = {};
  }
  if (!res.ok) throw new Error(data.error ? JSON.stringify(data) : text);
  return data;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, userId, appId } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId - user must be authenticated" },
        { status: 400 }
      );
    }

    // Fetch per-user app credentials from Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const user = await convex.query(api.users.getUser, { userId });

    if (!user || !user.facebookAppId || !user.facebookAppSecret) {
      return NextResponse.json(
        { error: "Facebook app credentials not configured for this user. Please set them up first." },
        { status: 400 }
      );
    }

    // Validate appId from state matches stored one (security check)
    if (appId && appId !== user.facebookAppId) {
      return NextResponse.json(
        { error: "App ID mismatch - potential security issue" },
        { status: 403 }
      );
    }

    const clientId = user.facebookAppId;
    const clientSecret = user.facebookAppSecret;
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;

    if (!redirectUri) {
      return NextResponse.json(
        { error: "Redirect URI not configured on server" },
        { status: 500 }
      );
    }

    // 1) Short-lived user access token
    const tokenData = await getJson(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&client_secret=${clientSecret}&code=${code}`
    );
    const userAccessToken: string = tokenData.access_token;

    // 2) Long-lived user token (optional but recommended)
    let longLivedToken = userAccessToken;
    try {
      const ll = await getJson(
        `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${userAccessToken}`
      );
      if (ll.access_token) longLivedToken = ll.access_token;
    } catch (e) {
      console.warn("Long-lived token exchange failed, proceeding with short-lived", e);
    }

    // 3) List pages via both endpoints and find one with instagram_business_account
    //    - /me/accounts works when the user has Facebook access (Admin/Editor)
    //    - /me/assigned_pages works when the user has Task access via Business Manager
    const accountsResp = await getJson(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account,tasks&limit=50&access_token=${encodeURIComponent(
        longLivedToken
      )}`
    );
    let assignedResp: any = { data: [] };
    try {
      assignedResp = await getJson(
        `https://graph.facebook.com/v18.0/me/assigned_pages?fields=id,name,tasks&limit=50&access_token=${encodeURIComponent(
          longLivedToken
        )}`
      );
    } catch (e: any) {
      // Some tokens/users don't support this edge; treat as non-fatal and continue with /me/accounts only
      assignedResp = { data: [], error: e?.message || String(e) };
    }

    // Normalize initial pages from /me/accounts (may already include access_token and ig link)
    const byId: Record<string, any> = Object.create(null);
    const accountsPages: any[] = accountsResp.data || [];
    for (const p of accountsPages) {
      byId[p.id] = {
        id: p.id,
        name: p.name,
        access_token: p.access_token,
        instagram_business_account: p.instagram_business_account,
        source: "accounts",
        tasks: p.tasks || [],
      };
    }

    // Add/merge pages from /me/assigned_pages; fetch missing details per page
    const assignedPages: any[] = assignedResp.data || [];
    for (const p of assignedPages) {
      if (!byId[p.id]) {
        byId[p.id] = { id: p.id, name: p.name, source: "assigned_pages", tasks: p.tasks || [] };
      } else {
        byId[p.id].source = `${byId[p.id].source},assigned_pages`;
        byId[p.id].tasks = Array.from(new Set([...(byId[p.id].tasks || []), ...(p.tasks || [])]));
      }
    }

    // For any page missing access_token or instagram_business_account, fetch directly using the user token
    const allPages = Object.values(byId);
    for (const p of allPages) {
      if (!p.access_token || !p.instagram_business_account) {
        try {
          const details = await getJson(
            `https://graph.facebook.com/v18.0/${p.id}?fields=name,instagram_business_account,access_token&access_token=${encodeURIComponent(
              longLivedToken
            )}`
          );
          p.name = details.name || p.name;
          if (details.access_token) p.access_token = details.access_token;
          if (details.instagram_business_account) p.instagram_business_account = details.instagram_business_account;
        } catch (e) {
          // best-effort; continue
        }
      }
    }

    // Choose the first page that has an instagram_business_account id
    const pages: any[] = allPages as any[];
    let selectedPage: any = pages.find((p) => p.instagram_business_account?.id);

    if (!selectedPage) {
      const pageNames = pages.map((p) => ({ id: p.id, name: p.name, source: p.source, tasks: p.tasks })).slice(0, 20);
      return NextResponse.json(
        {
          error:
            "No Facebook Page with linked Instagram Business account. Ensure IG is linked to a Page and that you selected it during OAuth (Edit Settings). If your Page shows only 'Task access', either switch to 'Facebook access' Admin or keep task access and try again.",
          accounts_count: accountsPages.length,
          assigned_pages_count: assignedPages.length,
          pages_found: pageNames,
          assigned_pages_error: assignedResp?.error,
        },
        { status: 400 }
      );
    }
    const pageId: string = selectedPage.id;
    const pageAccessToken: string = selectedPage.access_token;
    const instagramAccountId: string = selectedPage.instagram_business_account.id;

    // 4) Long-lived page token (optional). Some flows keep using pageAccessToken directly.
    let finalAccessToken = pageAccessToken;
    try {
      const llPage = await getJson(
        `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${pageAccessToken}`
      );
      if (llPage.access_token) finalAccessToken = llPage.access_token;
    } catch (e) {
      console.warn("Page long-lived token exchange failed, using original page access token.", e);
    }

    const tokenExpiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000; // approximate 60 days

    return NextResponse.json({
      access_token: finalAccessToken,
      instagram_account_id: instagramAccountId,
      page_id: pageId,
      token_expires_at: tokenExpiresAt,
    });
  } catch (error: any) {
    console.error("Token exchange error:", error);
    // Improve messaging for reused authorization code scenario (error_subcode 36009)
    let message = error.message || "Internal server error";
    try {
      const parsed = JSON.parse(message);
      const fbErr = parsed?.error || parsed;
      if (
        (fbErr?.error_subcode === 36009 || /authorization code has been used/i.test(fbErr?.message)) &&
        fbErr?.code === 100
      ) {
        message = "Authorization code already used. Restart the connection: go back to the app, click 'Connect Instagram', and complete the dialog again (a code can only be exchanged once).";
      }
    } catch {
      if (/authorization code has been used/i.test(message)) {
        message = "Authorization code already used. Restart the connection: click 'Connect Instagram' again.";
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
