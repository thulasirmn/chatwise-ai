"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageDoc } from "@/convex/types";
import { useAuth } from "@clerk/nextjs";

export default function MessagesTab() {
  const { userId } = useAuth();
  const messages = useQuery(api.messages.listRecent, { userId: userId ?? "" }) as MessageDoc[] | undefined;

  return (
    <div className="space-y-4">
      {messages?.map((message) => (
        <Card key={message._id.toString()}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              @{message.senderUsername}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600 dark:text-zinc-400">
              {message.text}
            </p>
            {message.replyText && (
              <div className="mt-2 pl-4 border-l-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Reply: {message.replyText}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  Status: {message.status}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}