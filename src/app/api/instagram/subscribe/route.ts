import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const user = await convex.query(api.users.getUser, { userId });

    if (!user?.instagramPageId || !user?.instagramAccessToken) {
      return NextResponse.json(
        { error: "Instagram account not connected. Please connect first." },
        { status: 400 }
      );
    }

    // 1) Subscribe the PAGE for messaging events (DMs)
    // Valid fields (page-level): messages, messaging_postbacks
    const pageSubscribeUrl = `https://graph.facebook.com/v18.0/${user.instagramPageId}/subscribed_apps`;
    const pageSubscribeResponse = await fetch(pageSubscribeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: ["messages", "messaging_postbacks"],
        access_token: user.instagramAccessToken,
      }),
    });

    const pageSubscribeData = await pageSubscribeResponse.json();

    if (!pageSubscribeResponse.ok) {
      return NextResponse.json(
        { error: "Failed to subscribe page for messaging", details: pageSubscribeData },
        { status: 500 }
      );
    }

    // 2) Subscribe the INSTAGRAM ACCOUNT for comment/mention events
    // This is required for Instagram Graph Webhooks to deliver comments/mentions
    const igFields = [
      "comments",
      "live_comments",
      "mentions",
      "message_reactions",
      "message_edit",
    ];
    const igSubscribeUrl = `https://graph.facebook.com/v18.0/${user.instagramAccountId}/subscribed_apps`;
    const igSubscribeResponse = await fetch(igSubscribeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: igFields,
        access_token: user.instagramAccessToken,
      }),
    });

    const igSubscribeData = await igSubscribeResponse.json();

    // Return success even if IG subscription endpoint is not available for your app in Dev mode.
    // Comments/mentions delivery depends primarily on the App Dashboard Webhooks (Instagram object) being Verified & Saved.
    return NextResponse.json({
      success: true,
      note: !igSubscribeResponse.ok
        ? "Instagram account subscribed_apps call not available; ensure Webhooks > Instagram is Verified & Saved."
        : undefined,
      page_id: user.instagramPageId,
      instagram_account_id: user.instagramAccountId,
      page_subscribed_fields: ["messages", "messaging_postbacks"],
      ig_subscribed_fields: igFields,
      page_response: pageSubscribeData,
      ig_response: igSubscribeData,
      ig_subscription_status: igSubscribeResponse.ok ? "ok" : "skipped",
    });
  } catch (error: any) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to subscribe page" },
      { status: 500 }
    );
  }
}

// GET to check current subscriptions
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const user = await convex.query(api.users.getUser, { userId });

    if (!user?.instagramPageId || !user?.instagramAccessToken) {
      return NextResponse.json(
        { error: "Instagram account not connected" },
        { status: 400 }
      );
    }

    // Check current subscriptions
    const checkUrl = `https://graph.facebook.com/v18.0/${user.instagramPageId}/subscribed_apps?access_token=${encodeURIComponent(user.instagramAccessToken)}`;
    const checkResponse = await fetch(checkUrl);
    const checkData = await checkResponse.json();

    return NextResponse.json({
      page_id: user.instagramPageId,
      subscriptions: checkData,
    });
  } catch (error: any) {
    console.error("Check subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check subscriptions" },
      { status: 500 }
    );
  }
}
