import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

async function getJson(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, userId, appId } = body;

    if (!code || !userId) {
      return NextResponse.json({ error: "Missing code or userId" }, { status: 400 });
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const user = await convex.query(api.users.getUser, { userId });

    if (!user || !user.facebookAppId || !user.facebookAppSecret) {
      return NextResponse.json({ error: "App credentials not found" }, { status: 400 });
    }

    if (appId && appId !== user.facebookAppId) {
      return NextResponse.json({ error: "App ID mismatch" }, { status: 403 });
    }

    const clientId = user.facebookAppId;
    const clientSecret = user.facebookAppSecret;
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!;

    // 1. Exchange code for token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`;
    const tokenData = await getJson(tokenUrl);

    if (tokenData.error) {
      return NextResponse.json({
        step: "token_exchange",
        error: tokenData,
      });
    }

    const accessToken = tokenData.access_token;

    // 2. Debug token to see scopes
    const debugTokenUrl = `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    const debugToken = await getJson(debugTokenUrl);

    // 3. Get /me
    const meUrl = `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`;
    const meData = await getJson(meUrl);

  // 4. Get /me/accounts with detailed fields
  const accountsUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account,tasks&access_token=${accessToken}`;
  const accountsData = await getJson(accountsUrl);

  // 4b. Get /me/assigned_pages for task-based access
    let assignedData: any = { data: [] };
    try {
      const assignedUrl = `https://graph.facebook.com/v18.0/me/assigned_pages?fields=id,name,tasks&access_token=${accessToken}`;
      assignedData = await getJson(assignedUrl);
    } catch (e: any) {
      assignedData = { data: [], error: e?.message || String(e) };
    }

    // 5. Get /me/permissions
    const permsUrl = `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`;
    const permsData = await getJson(permsUrl);

    return NextResponse.json({
      success: true,
      token_info: {
        type: tokenData.token_type,
        expires_in: tokenData.expires_in,
      },
      debug_token: {
        app_id: debugToken.data?.app_id,
        user_id: debugToken.data?.user_id,
        scopes: debugToken.data?.scopes || [],
        expires_at: debugToken.data?.expires_at,
        is_valid: debugToken.data?.is_valid,
      },
      me: {
        id: meData.id,
        name: meData.name,
      },
      accounts: {
        count: accountsData.data?.length || 0,
        pages: accountsData.data?.map((p: any) => ({
          id: p.id,
          name: p.name,
          has_ig: !!p.instagram_business_account,
          ig_id: p.instagram_business_account?.id,
          tasks: p.tasks || [],
        })) || [],
        error: accountsData.error,
      },
      assigned_pages: {
        count: assignedData.data?.length || 0,
        pages: assignedData.data?.map((p: any) => ({ id: p.id, name: p.name, tasks: p.tasks || [] })) || [],
        error: assignedData.error,
      },
      permissions: {
        granted: permsData.data?.filter((p: any) => p.status === "granted").map((p: any) => p.permission) || [],
        declined: permsData.data?.filter((p: any) => p.status === "declined").map((p: any) => p.permission) || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Debug failed" },
      { status: 500 }
    );
  }
}
