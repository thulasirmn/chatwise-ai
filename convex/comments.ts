import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

export type CommentDoc = Doc<"comments"> & {
  commentId: string;
  postId: string;
  text: string;
  authorId: string;
  authorUsername: string;
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
      .query("comments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(20);
  },
});

export const createComment = mutation({
  args: {
    commentId: v.string(),
    postId: v.string(),
    text: v.string(),
    authorId: v.string(),
    authorUsername: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("comments", {
      ...args,
      timestamp: Date.now(),
      status: "pending" as const,
    });
  },
});

export const updateCommentStatus = mutation({
  args: {
    commentId: v.id("comments"),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    replyText: v.optional(v.string()),
    replyError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.commentId, {
      status: args.status,
      replyText: args.replyText,
      replyError: args.replyError,
      repliedAt: Date.now(),
    });
  },
});