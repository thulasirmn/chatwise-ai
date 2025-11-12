import { Doc, Id } from "../../convex/_generated/dataModel";

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