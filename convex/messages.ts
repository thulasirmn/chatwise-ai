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
      .take(20);
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