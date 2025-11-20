import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Find user by Clerk authId
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("authId"), args.userId))
      .first();
    if (!user) return null;

    // Count DMs
    const dmCount = (await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect()).length;

    // Count comments
    const commentCount = (await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect()).length;

    // Count auto-replies sent (messages and comments with status 'sent')
    const autoReplyCount =
      (await ctx.db
        .query("messages")
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), user._id),
            q.eq(q.field("status"), "sent")
          )
        )
        .collect()).length +
      (await ctx.db
        .query("comments")
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), user._id),
            q.eq(q.field("status"), "sent")
          )
        )
        .collect()).length;

    // Recent events: last 10 messages/comments
    const recentMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(5);
    const recentComments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(5);

    const recentEvents = [
      ...recentMessages.map((m) => ({
        type: "DM",
        text: m.text,
        timestamp: m.timestamp,
      })),
      ...recentComments.map((c) => ({
        type: "Comment",
        text: c.text,
        timestamp: c.timestamp,
      })),
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

    return {
      dmCount,
      commentCount,
      autoReplyCount,
      recentEvents,
    };
  },
});
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("authId"), identity.subject))
      .first();
    
    if (!user) return null;

    // Get all comments and messages for the user
    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Calculate statistics
    const totalComments = comments.length;
    const totalMessages = messages.length;

    const respondedComments = comments.filter(c => c.status === "sent").length;
    const respondedMessages = messages.filter(m => m.status === "sent").length;

    const commentResponseRate = totalComments > 0 
      ? Math.round((respondedComments / totalComments) * 100) 
      : 0;

    const messageResponseRate = totalMessages > 0
      ? Math.round((respondedMessages / totalMessages) * 100)
      : 0;

    // Calculate average response time for sent items
    const sentItems = [...comments, ...messages].filter(item => 
      item.status === "sent" && item.repliedAt && item.timestamp
    );

    const avgResponseTime = sentItems.length > 0
      ? Math.round(
          sentItems.reduce((acc, item) => 
            acc + ((item.repliedAt! - item.timestamp) / 1000), 0
          ) / sentItems.length
        )
      : 0;

    // Calculate overall success rate
    const totalAttempted = [...comments, ...messages].filter(
      item => ["sent", "failed"].includes(item.status)
    ).length;

    const totalSucceeded = [...comments, ...messages].filter(
      item => item.status === "sent"
    ).length;

    const successRate = totalAttempted > 0
      ? Math.round((totalSucceeded / totalAttempted) * 100)
      : 0;

    return {
      totalComments,
      totalMessages,
      commentResponseRate,
      messageResponseRate,
      avgResponseTime,
      successRate,
    };
  },
});