import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Our messages document type
export type MessageDoc = Doc<"messages"> & {
  messageId: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  text: string;
  timestamp: number;
  status: "pending" | "sent" | "failed" | "skipped";
  replyText?: string;
  replyError?: string;
  repliedAt?: number;
  userId: Id<"users">;
};

export const listRecent = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("authId"), args.userId))
      .first();
    
    if (!user) return [];

    return await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(100);
  },
});

export const getConversations = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("authId"), args.userId))
      .first();
    
    if (!user) return [];

    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(100);

    // Group messages by sender
    const conversationsMap = new Map<string, any>();
    
    for (const message of messages) {
      const senderId = message.senderId;
      
      if (!conversationsMap.has(senderId)) {
        conversationsMap.set(senderId, {
          senderId,
          senderUsername: message.senderUsername,
          messages: [],
          lastMessageTime: message.timestamp,
          unreadCount: message.status === "pending" ? 1 : 0,
        });
      }
      
      const conversation = conversationsMap.get(senderId)!;
      conversation.messages.push(message);
      
      // Update unread count
      if (message.status === "pending") {
        conversation.unreadCount++;
      }
    }
    
    // Convert to array and sort by last message time
    return Array.from(conversationsMap.values())
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  },
});

export const createMessage = mutation({
  args: {
    messageId: v.string(),
    senderId: v.string(),
    senderUsername: v.string(),
    recipientId: v.string(),
    text: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      ...args,
      timestamp: Date.now(),
      status: "pending" as const,
    });
  },
});

export const updateMessageStatus = mutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    replyText: v.optional(v.string()),
    replyError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.messageId, {
      status: args.status,
      replyText: args.replyText,
      replyError: args.replyError,
      repliedAt: Date.now(),
    });
  },
});

export const updateMessageByInstagramId = mutation({
  args: {
    messageId: v.string(), // Instagram message ID
    userId: v.id("users"),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    replyText: v.optional(v.string()),
    replyError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .filter((q) => 
        q.and(
          q.eq(q.field("messageId"), args.messageId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();
    
    if (!message) return null;
    
    return await ctx.db.patch(message._id, {
      status: args.status,
      replyText: args.replyText,
      replyError: args.replyError,
      repliedAt: Date.now(),
    });
  },
});

export const updateUsername = mutation({
  args: {
    messageId: v.id("messages"),
    senderUsername: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.messageId, {
      senderUsername: args.senderUsername,
    });
  },
});

export const updateUsernameByInstagramId = mutation({
  args: {
    messageId: v.string(), // Instagram message ID
    userId: v.id("users"),
    senderUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .filter((q) => 
        q.and(
          q.eq(q.field("messageId"), args.messageId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();
    
    if (!message) return null;
    
    return await ctx.db.patch(message._id, {
      senderUsername: args.senderUsername,
    });
  },
});