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

    // Subscribe the page to the app for Instagram webhook fields
    const subscribeUrl = `https://graph.facebook.com/v18.0/${user.instagramPageId}/subscribed_apps`;
    const subscribeResponse = await fetch(subscribeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: ["messages", "messaging_postbacks", "comments", "feed"],
        access_token: user.instagramAccessToken,
      }),
    });

    const subscribeData = await subscribeResponse.json();

    if (!subscribeResponse.ok) {
      return NextResponse.json(
        { error: "Failed to subscribe page", details: subscribeData },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      page_id: user.instagramPageId,
      subscribed_fields: ["messages", "messaging_postbacks", "comments", "feed"],
      response: subscribeData,
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
