import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Webhook handler for Instagram messages and comments
 */
export const handleWebhook = mutation({
  args: {
    object: v.string(),
    entry: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    if (args.object !== "instagram") return;

    for (const entry of args.entry) {
      // Handle messages (DMs)
      if (entry.messaging) {
        for (const event of entry.messaging) {
          const senderId = event.sender.id;
          const recipientId = event.recipient.id;
          
          if (event.message) {
            const messageText = event.message.text;
            const messageId = event.message.mid;

            // Find user by Instagram account ID
            const user = await ctx.db
              .query("users")
              .filter((q) => q.eq(q.field("instagramAccountId"), recipientId))
              .first();

            if (!user) continue;

            // Store the message
            await ctx.db.insert("messages", {
              messageId,
              senderId,
              senderUsername: "unknown", // Will be fetched separately
              recipientId,
              text: messageText,
              timestamp: Date.now(),
              status: "pending",
              userId: user._id,
            });
          }
        }
      }

      // Handle comments
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === "comments" && change.value) {
            const commentId = change.value.id;
            const text = change.value.text;
            const postId = change.value.media?.id;
            const authorId = change.value.from?.id;
            const authorUsername = change.value.from?.username;

            // Find user by Instagram account ID
            const user = await ctx.db
              .query("users")
              .filter((q) => 
                q.eq(q.field("instagramAccountId"), change.value.media?.owner?.id)
              )
              .first();

            if (!user) continue;

            // Store the comment
            await ctx.db.insert("comments", {
              commentId,
              postId: postId || "unknown",
              text,
              authorId: authorId || "unknown",
              authorUsername: authorUsername || "unknown",
              timestamp: Date.now(),
              status: "pending",
              userId: user._id,
            });
          }
        }
      }
    }
  },
});

/**
 * Process stored events and auto-reply based on rules
 */
export const processIncomingEvent = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("dm"), v.literal("comment")),
    content: v.string(),
    targetId: v.string(), // message id or comment id/media id as needed
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.instagramAccessToken || !user.instagramAccountId) return { skipped: true };

    // Load enabled rules for this user/type
    const rules = await ctx.db
      .query("autoReplyRules")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as Id<"users">))
      .collect();

    const enabledRules = rules.filter((r) => r.enabled && r.type === args.type);

    const matched = enabledRules.find((r) => args.content.toLowerCase().includes(r.pattern.toLowerCase()));
    if (!matched) return { matched: false };

    // Send reply via Graph API
    try {
      if (args.type === "dm") {
        await sendDmReply(user.instagramAccountId, args.targetId, matched.replyText, user.instagramAccessToken);
      } else {
        await sendCommentReply(args.targetId, matched.replyText, user.instagramAccessToken);
      }
      return { matched: true };
    } catch (e) {
      console.error("Failed to send Instagram reply:", e);
      return { matched: true, error: true };
    }
  },
});

async function sendDmReply(igUserId: string, conversationId: string, text: string, accessToken: string) {
  // Instagram Messaging API requires page-scoped conversation id or sender id; this is a placeholder
  const url = `https://graph.facebook.com/v18.0/${igUserId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: conversationId },
      message: { text },
      access_token: accessToken,
    }),
  });
}

async function sendCommentReply(commentIdOrMediaId: string, text: string, accessToken: string) {
  // To reply to a comment: POST /{ig-comment-id}/replies
  const url = `https://graph.facebook.com/v18.0/${commentIdOrMediaId}/replies`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      access_token: accessToken,
    }),
  });
}

/**
 * Get webhook verification challenge (for initial setup)
 */
export const verifyWebhook = query({
  args: {
    mode: v.string(),
    token: v.string(),
    challenge: v.string(),
  },
  handler: async (ctx, args) => {
    const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || "chatwise_verify_token";
    
    if (args.mode === "subscribe" && args.token === VERIFY_TOKEN) {
      return { challenge: args.challenge };
    }
    
    return { error: "Verification failed" };
  },
});
