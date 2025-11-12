"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentDoc } from "@/convex/types";
import { useAuth } from "@clerk/nextjs";

export default function CommentsTab() {
  const { userId } = useAuth();
  const comments = useQuery(api.comments.listRecent, { userId: userId ?? "" }) as CommentDoc[] | undefined;

  return (
    <div className="space-y-4">
      {comments?.map((comment) => (
        <Card key={comment._id.toString()}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              @{comment.authorUsername}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600 dark:text-zinc-400">
              {comment.text}
            </p>
            {comment.replyText && (
              <div className="mt-2 pl-4 border-l-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Reply: {comment.replyText}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  Status: {comment.status}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}