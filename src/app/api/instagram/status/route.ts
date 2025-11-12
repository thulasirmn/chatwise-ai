import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    // Get user details
    const user = await convex.query(api.users.getUser, { userId });
    
    if (!user) {
      return NextResponse.json({ 
        connected: false,
        message: "No user found. Please set up your Facebook app credentials first."
      });
    }

    // Get recent messages
    const messages = await convex.query(api.queries.listRecentMessages, { userId });
    
    // Get recent comments
    const comments = await convex.query(api.users.listRecent, { userId });

    // Get auto-reply rules
    const rules = await convex.query(api.queries.listRules, { userId });

    return NextResponse.json({
      connected: !!user.instagramAccountId,
      account: {
        instagram_account_id: user.instagramAccountId || null,
        instagram_page_id: user.instagramPageId || null,
        connected_at: user.instagramConnectedAt || null,
        token_expires_at: user.instagramTokenExpiresAt || null,
        token_expired: user.instagramTokenExpiresAt && user.instagramTokenExpiresAt < Date.now(),
      },
      settings: {
        auto_reply_enabled: user.autoReplyEnabled,
        require_approval: user.requireApproval,
      },
      recent_events: {
        messages: messages.slice(0, 10).map((m: any) => ({
          id: m.messageId,
          sender: m.senderUsername || m.senderId,
          text: m.text?.substring(0, 50) + (m.text?.length > 50 ? "..." : ""),
          status: m.status,
          timestamp: m.timestamp,
        })),
        comments: comments.slice(0, 10).map((c: any) => ({
          id: c.commentId,
          author: c.authorUsername,
          text: c.text?.substring(0, 50) + (c.text?.length > 50 ? "..." : ""),
          status: c.status,
          timestamp: c.timestamp,
        })),
      },
      rules: {
        count: rules.length,
        active: rules.filter((r: any) => r.enabled).length,
        sample: rules.slice(0, 3).map((r: any) => ({
          pattern: r.pattern,
          reply: r.replyText.substring(0, 40) + (r.replyText.length > 40 ? "..." : ""),
          type: r.type,
          enabled: r.enabled,
        })),
      },
    });
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch status" },
      { status: 500 }
    );
  }
}
