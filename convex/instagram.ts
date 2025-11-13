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
          console.log("📝 Change detected:", { field: change.field, hasValue: !!change.value });
          
          // Handle both "comments" and "live_comments" fields
          if ((change.field === "comments" || change.field === "live_comments") && change.value) {
            console.log("💬 Comment value:", JSON.stringify(change.value, null, 2));
            
            const commentId = change.value.id;
            const text = change.value.text;
            const postId = change.value.media?.id;
            const authorId = change.value.from?.id;
            const authorUsername = change.value.from?.username;
            
            // Try to find owner ID from various possible locations
            const ownerId = change.value.media?.owner?.id || 
                          change.value.media?.ig_id || 
                          entry.id;
            
            console.log("🔍 Looking for user with IG account ID:", ownerId);

            // Find user by Instagram account ID
            const user = await ctx.db
              .query("users")
              .filter((q) => 
                q.eq(q.field("instagramAccountId"), ownerId)
              )
              .first();

            if (!user) {
              console.log("⚠️ No user found for IG account:", ownerId);
              continue;
            }
            
            console.log("✅ User found, storing comment");

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
        // Update comment record with reply info
        // Find the comment by userId and commentId
        const commentDoc = await ctx.runQuery(api.comments.findByCommentId, {
          userId: user._id,
          commentId: args.targetId,
        });
        if (commentDoc) {
          await ctx.runMutation(api.comments.updateCommentStatus, {
            commentId: commentDoc._id,
            status: "sent",
            replyText: matched.replyText,
          });
        }
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

/**
 * Manually sync recent media comments from IG Graph as a fallback when webhooks are unreliable in dev.
 */
export const syncRecentComments = action({
  args: {
    // Clerk authId
    authUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getUser, { userId: args.authUserId });
    if (!user?.instagramAccessToken || !user.instagramAccountId) {
      return { ok: false, reason: "not_connected" };
    }

    const accessToken = user.instagramAccessToken as string;
    const igUserId = user.instagramAccountId as string;
    const maxMedia = args.limit ?? 5;

    // 1) Fetch recent media
    const mediaResp = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media?fields=id,caption,timestamp&limit=${maxMedia}&access_token=${encodeURIComponent(accessToken)}`
    );
    const mediaJson = await mediaResp.json();
    if (!mediaResp.ok) {
      console.error("IG media fetch failed:", mediaJson);
      return { ok: false, reason: "media_fetch_failed", details: mediaJson };
    }

    const results: any[] = [];
    for (const m of mediaJson.data || []) {
      console.log("📸 Fetching comments for media:", m.id);
      
      // 2) For each media, fetch comments (filter out caption by requesting from field)
      const commentsResp = await fetch(
        `https://graph.facebook.com/v18.0/${m.id}/comments?fields=id,text,username,timestamp,from&access_token=${encodeURIComponent(accessToken)}`
      );
      const commentsJson = await commentsResp.json();
      if (!commentsResp.ok) {
        console.warn("Comments fetch failed for media", m.id, commentsJson);
        continue;
      }

      console.log(`💬 Found ${commentsJson.data?.length || 0} comments for media ${m.id}`);

      for (const c of commentsJson.data || []) {
        console.log("🔍 Raw comment data:", { id: c.id, text: c.text?.substring(0, 80), username: c.username, from: c.from });
        
        // Skip if this is the media caption (check if text matches caption exactly or is very long)
        if (c.text === m.caption || c.text?.length > 500) {
          console.log("⏭️ Skipping caption/long text as comment");
          continue;
        }

        console.log("💭 Processing comment:", { id: c.id, text: c.text?.substring(0, 50), username: c.username });

        // Deduplicate
        const existing = await ctx.runQuery(api.comments.findByCommentId, {
          userId: user._id,
          commentId: c.id,
        });
        if (!existing) {
          // Store comment
          await ctx.runMutation(api.comments.createComment, {
            commentId: c.id,
            postId: m.id,
            text: c.text || "",
            authorId: c.from?.id || "unknown",
            authorUsername: c.username || c.from?.username || "unknown",
            userId: user._id,
          });
          console.log("✅ Stored new comment:", c.id);
        } else {
          console.log("⏭️ Comment already exists:", c.id);
        }

        // Run auto-reply rules if any (only for new real comments, not captions)
        try {
          const result = await ctx.runAction(api.instagram.processIncomingEvent, {
            userId: user._id,
            type: "comment",
            content: c.text || "",
            targetId: c.id,
          });
          console.log("🤖 Auto-reply result:", result);
        } catch (e) {
          console.warn("Auto-reply (comment) failed for", c.id, e);
        }

        results.push({ mediaId: m.id, commentId: c.id, text: c.text?.substring(0, 30) });
      }
    }

    return { ok: true, synced: results.length, items: results };
  },
});
