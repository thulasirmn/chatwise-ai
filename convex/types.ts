import { GenericId } from "convex/values";

export interface CommentDoc {
  _id: GenericId<"comments">;
  _creationTime: number;
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
  userId: GenericId<"users">;
}

export interface MessageDoc {
  _id: GenericId<"messages">;
  _creationTime: number;
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
  userId: GenericId<"users">;
}

export interface UserDoc {
  _id: GenericId<"users">;
  _creationTime: number;
  name: string;
  email: string;
  authId: string;
  instagramAccountId?: string;
  instagramAccessToken?: string;
  instagramConnectedAt?: number;
  brandVoice?: string;
  autoReplyEnabled: boolean;
  requireApproval: boolean;
}