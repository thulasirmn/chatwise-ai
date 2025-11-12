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

    const body = await request.json();
    const { pattern, replyText, type = "dm" } = body;

    if (!pattern || !replyText) {
      return NextResponse.json(
        { error: "Missing required fields: pattern, replyText" },
        { status: 400 }
      );
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    // Get user's internal ID
    const user = await convex.query(api.users.getUser, { userId });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create the rule
    const ruleId = await convex.mutation(api.autoReplyRules.createRule, {
      userId: user._id,
      type,
      pattern,
      replyText,
      enabled: true,
    });

    return NextResponse.json({
      success: true,
      rule_id: ruleId,
      pattern,
      replyText,
      type,
    });
  } catch (error: any) {
    console.error("Create rule error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create rule" },
      { status: 500 }
    );
  }
}
