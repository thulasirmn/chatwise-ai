import { query } from "./_generated/server";
import { v } from "convex/values";

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