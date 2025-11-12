import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current authenticated user
 */
export const getUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("authId"), args.userId))
      .first();

    return user;
  },
});

export const getUserByInstagramId = query({
  args: { instagramAccountId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("instagramAccountId"), args.instagramAccountId))
      .first();
    return user;
  },
});

export const connectInstagramAccount = mutation({
  args: {
    userId: v.string(),
    instagramAccountId: v.string(),
    accessToken: v.string(),
    pageId: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // First try to find existing user
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("authId"), args.userId))
      .first();

    if (existingUser) {
      // Update existing user
      return await ctx.db.patch(existingUser._id, {
        instagramAccountId: args.instagramAccountId,
        instagramAccessToken: args.accessToken,
        instagramPageId: args.pageId,
        instagramConnectedAt: Date.now(),
        instagramTokenExpiresAt: args.tokenExpiresAt,
      });
    }

    // Create new user
    return await ctx.db.insert("users", {
      authId: args.userId,
      name: "", // Required by schema, will be updated later
      email: "", // Required by schema, will be updated later
      instagramAccountId: args.instagramAccountId,
      instagramAccessToken: args.accessToken,
      instagramPageId: args.pageId,
      instagramConnectedAt: Date.now(),
      instagramTokenExpiresAt: args.tokenExpiresAt,
      autoReplyEnabled: true,
      requireApproval: true,
    });
  },
});

export const disconnectInstagram = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("authId"), args.userId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        instagramAccountId: undefined,
        instagramAccessToken: undefined,
        instagramPageId: undefined,
        instagramConnectedAt: undefined,
        instagramTokenExpiresAt: undefined,
      });
      return user._id;
    }
    return null;
  },
});

export const setFacebookApp = mutation({
  args: {
    userId: v.string(),
    facebookAppId: v.string(),
    facebookAppSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("authId"), args.userId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        facebookAppId: args.facebookAppId,
        facebookAppSecret: args.facebookAppSecret,
      });
      return user._id;
    }

    return await ctx.db.insert("users", {
      authId: args.userId,
      name: "",
      email: "",
      facebookAppId: args.facebookAppId,
      facebookAppSecret: args.facebookAppSecret,
      autoReplyEnabled: true,
      requireApproval: true,
    });
  },
});

// Comments

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
      status: "pending",
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