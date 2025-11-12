import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listRules = query({
  args: { userId: v.id("users"), type: v.optional(v.union(v.literal("dm"), v.literal("comment"))) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("autoReplyRules").withIndex("by_user", (q) => q.eq("userId", args.userId));
    const rules = await q.collect();
    return args.type ? rules.filter((r) => r.type === args.type) : rules;
  },
});

export const createRule = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("dm"), v.literal("comment")),
    pattern: v.string(),
    replyText: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("autoReplyRules", { ...args, createdAt: Date.now() });
  },
});

export const updateRule = mutation({
  args: {
    ruleId: v.id("autoReplyRules"),
    pattern: v.optional(v.string()),
    replyText: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { ruleId, ...patch } = args;
    await ctx.db.patch(ruleId, patch);
    return ruleId;
  },
});

export const deleteRule = mutation({
  args: { ruleId: v.id("autoReplyRules") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.ruleId);
  },
});
