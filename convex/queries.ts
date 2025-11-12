import { query } from "./_generated/server";
import { v } from "convex/values";

export const listRecentMessages = query({
  args: { userId: v.string() },
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

export const listRules = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("authId"), args.userId))
      .first();
    
    if (!user) return [];

    return await ctx.db
      .query("autoReplyRules")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .collect();
  },
});
