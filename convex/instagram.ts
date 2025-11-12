import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

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
          // Skip events without sender/recipient (e.g., read receipts)
          if (!event.sender || !event.recipient) continue;
          
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
 * Process stored events and auto-reply based on rules (ACTION - can use fetch)
 */
export const processIncomingEvent = action({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("dm"), v.literal("comment")),
    content: v.string(),
    targetId: v.string(), // sender id for DM or comment id
    messageId: v.optional(v.string()), // for updating the message record
  },
  handler: async (ctx, args) => {
    console.log("🔄 Processing incoming event:", { type: args.type, content: args.content, targetId: args.targetId });
    
    // Get user data by Convex ID (not authId)
    const user = await ctx.runQuery(api.users.getUserById, { userId: args.userId });
    if (!user?.instagramAccessToken || !user.instagramAccountId) {
      console.log("⚠️ User missing Instagram credentials");
      return { skipped: true };
    }
    console.log("✅ User found:", { authId: user.authId, igAccountId: user.instagramAccountId });

    // Fetch and update username for DMs
    if (args.type === "dm" && args.messageId) {
      try {
        const username = await fetchInstagramUsername(args.targetId, user.instagramAccessToken);
        console.log("📝 Fetched username:", username);
        await ctx.runMutation(api.messages.updateUsernameByInstagramId, {
          messageId: args.messageId,
          userId: args.userId,
          senderUsername: username,
        });
      } catch (e) {
        console.error("Failed to fetch/update username:", e);
      }
    }

    // Load enabled rules for this user/type - need to pass authId, not _id
    const rules = await ctx.runQuery(api.queries.listRules, { userId: user.authId });
    console.log("📋 Rules loaded:", rules.length, "total");
    
    const enabledRules = rules.filter((r: any) => r.enabled && r.type === args.type);
    console.log("✅ Enabled rules for type", args.type, ":", enabledRules.length);
    enabledRules.forEach((r: any) => console.log("  - Pattern:", r.pattern, "Reply:", r.replyText.substring(0, 50)));

    const matched = enabledRules.find((r: any) => args.content.toLowerCase().includes(r.pattern.toLowerCase()));
    if (!matched) {
      console.log("❌ No matching rule for:", args.content);
      return { matched: false };
    }
    console.log("✅ Matched rule:", matched.pattern);

    // Send reply via Graph API (fetch is allowed in actions)
    try {
      console.log("📤 Attempting to send reply...");
      if (args.type === "dm") {
        if (!user.instagramPageId) {
          console.error("❌ Missing Page ID - cannot send DM");
          return { matched: true, error: true, message: "Missing Page ID" };
        }
        console.log("💬 Sending DM reply via Page:", user.instagramPageId, "to:", args.targetId);
        await sendDmReply(user.instagramPageId, args.targetId, matched.replyText, user.instagramAccessToken);
        
        // Update message record if messageId provided
        if (args.messageId) {
          await ctx.runMutation(api.messages.updateMessageByInstagramId, {
            messageId: args.messageId,
            userId: args.userId,
            status: "sent",
            replyText: matched.replyText,
          });
        }
      } else {
        console.log("💬 Sending comment reply to:", args.targetId);
        await sendCommentReply(args.targetId, matched.replyText, user.instagramAccessToken);
      }
      console.log("✅ Reply sent successfully!");
      return { matched: true, sent: true };
    } catch (e: any) {
      console.error("❌ Failed to send Instagram reply:", e);
      
      // Update message record with error if messageId provided
      if (args.messageId && args.type === "dm") {
        await ctx.runMutation(api.messages.updateMessageByInstagramId, {
          messageId: args.messageId,
          userId: args.userId,
          status: "failed",
          replyError: e.message,
        });
      }
      
      return { matched: true, error: true, message: e.message };
    }
  },
});

async function fetchInstagramUsername(userId: string, accessToken: string): Promise<string> {
  try {
    const url = `https://graph.facebook.com/v18.0/${userId}?fields=username&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.username || "unknown";
  } catch (e) {
    console.error("Failed to fetch Instagram username:", e);
    return "unknown";
  }
}

async function sendDmReply(pageId: string, recipientId: string, text: string, accessToken: string) {
  // Instagram Messaging API: Send via Page, not IG account
  // Use the Facebook Page ID with the Instagram scoped recipient ID
  const url = `https://graph.facebook.com/v18.0/${pageId}/messages?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    console.error("Instagram API error:", data);
    throw new Error(`Instagram API error: ${data.error?.message || JSON.stringify(data)}`);
  }
  console.log("DM reply sent successfully:", data);
  return data;
}

async function sendCommentReply(commentIdOrMediaId: string, text: string, accessToken: string) {
  // To reply to a comment: POST /{ig-comment-id}/replies
  const url = `https://graph.facebook.com/v18.0/${commentIdOrMediaId}/replies`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      access_token: accessToken,
    }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    console.error("Instagram API error:", data);
    throw new Error(`Instagram API error: ${data.error?.message || JSON.stringify(data)}`);
  }
  console.log("Comment reply sent successfully:", data);
  return data;
}

/**
 * Fetch and update Instagram username for a sender
 */
export const fetchAndUpdateUsername = action({
  args: {
    userId: v.id("users"),
    senderId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user data
    const user = await ctx.runQuery(api.users.getUserById, { userId: args.userId });
    if (!user?.instagramAccessToken) {
      console.log("No access token for username fetch");
      return;
    }

    // Fetch username from Instagram
    const username = await fetchInstagramUsername(args.senderId, user.instagramAccessToken);
    console.log("Fetched username:", username, "for sender:", args.senderId);

    // Update all messages from this sender
    const messages = await ctx.runQuery(api.messages.listRecent, { userId: user.authId });
    
    for (const message of messages) {
      if (message.senderId === args.senderId && message.senderUsername === "unknown") {
        await ctx.runMutation(api.messages.updateUsername, {
          messageId: message._id,
          senderUsername: username,
        });
      }
    }
  },
});

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
