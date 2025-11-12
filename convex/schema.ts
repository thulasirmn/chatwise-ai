import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    // Clerk user ID
    authId: v.string(),
    // Instagram business account info
    instagramAccountId: v.optional(v.string()),
    instagramAccessToken: v.optional(v.string()),
    instagramPageId: v.optional(v.string()),
    instagramConnectedAt: v.optional(v.number()),
    instagramTokenExpiresAt: v.optional(v.number()),
    // Per-user Facebook app configuration (multi-tenant app ownership)
    facebookAppId: v.optional(v.string()),
    facebookAppSecret: v.optional(v.string()),
    // Settings
    brandVoice: v.optional(v.string()),
    autoReplyEnabled: v.boolean(),
    requireApproval: v.boolean(),
  })
    .index("by_auth_id", ["authId"])
    .searchIndex("search_by_name", {
      searchField: "name",
    }),

  comments: defineTable({
    // Instagram comment data
    commentId: v.string(),
    postId: v.string(),
    text: v.string(),
    authorId: v.string(),
    authorUsername: v.string(),
    timestamp: v.number(),
    // Reply status
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    replyText: v.optional(v.string()),
    replyError: v.optional(v.string()),
    repliedAt: v.optional(v.number()),
    // References
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  messages: defineTable({
    // Instagram DM data
    messageId: v.string(),
    senderId: v.string(),
    senderUsername: v.string(),
    recipientId: v.string(),
    text: v.string(),
    timestamp: v.number(),
    // Reply status
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    replyText: v.optional(v.string()),
    replyError: v.optional(v.string()),
    repliedAt: v.optional(v.number()),
    // References
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  catalogs: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    items: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        price: v.optional(v.number()),
      })
    ),
  }).index("by_user", ["userId"]),

  faqs: defineTable({
    userId: v.id("users"),
    question: v.string(),
    answer: v.string(),
  }).index("by_user", ["userId"]),

  // Auto-reply rules set by each user
  autoReplyRules: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("dm"), v.literal("comment")),
    pattern: v.string(), // simple substring match for now
    replyText: v.string(),
    enabled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]) 
    .index("by_type", ["type"]),
});