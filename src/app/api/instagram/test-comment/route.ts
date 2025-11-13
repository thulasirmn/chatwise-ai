import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Test endpoint to simulate an Instagram comment webhook
 * Use this to test comment handling without waiting for real webhooks
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { commentText, postId, userId } = body;

    if (!commentText || !userId) {
      return NextResponse.json(
        { error: "Missing commentText or userId" },
        { status: 400 }
      );
    }

    // Simulate Instagram comment webhook payload
    const simulatedWebhook = {
      object: "instagram",
      entry: [
        {
          id: "test-ig-account-id",
          time: Date.now(),
          changes: [
            {
              field: "comments",
              value: {
                id: `comment_${Date.now()}`,
                text: commentText,
                from: {
                  id: "test-commenter-123",
                  username: "test_user",
                },
                media: {
                  id: postId || "test-post-123",
                  media_product_type: "FEED",
                },
              },
            },
          ],
        },
      ],
    };

    console.log("🧪 Test comment webhook:", JSON.stringify(simulatedWebhook, null, 2));

    // Process through the webhook handler
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    // Store in Convex
    await convex.mutation(api.instagram.handleWebhook, simulatedWebhook);

    // Process for auto-reply
    const user = await convex.query(api.users.getUser, { userId });
    if (user) {
      await convex.action(api.instagram.processIncomingEvent, {
        userId: user._id,
        type: "comment",
        content: commentText,
        targetId: `comment_${Date.now()}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Test comment processed",
      webhook: simulatedWebhook,
    });
  } catch (error: any) {
    console.error("Test comment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process test comment" },
      { status: 500 }
    );
  }
}
