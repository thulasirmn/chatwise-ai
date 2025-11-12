"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

export default function MessagesTab() {
  const { userId } = useAuth();
  const conversations = useQuery(api.messages.getConversations, { userId: userId ?? "" });
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);

  const selectedConversation = conversations?.find((c: any) => c.senderId === selectedSenderId);

  if (!conversations) {
    return <div className="text-center py-8">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            No messages yet. Messages will appear here when customers send DMs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Conversations List */}
      <div className="md:col-span-1 space-y-2">
        <h3 className="text-sm font-semibold mb-2">Conversations</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {conversations.map((conversation: any) => (
            <Card
              key={conversation.senderId}
              className={`cursor-pointer transition-colors ${
                selectedSenderId === conversation.senderId
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "hover:border-zinc-400"
              }`}
              onClick={() => setSelectedSenderId(conversation.senderId)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">@{conversation.senderUsername}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {conversation.messages[0]?.text}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {new Date(conversation.lastMessageTime).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Message Thread */}
      <div className="md:col-span-2">
        {selectedConversation ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Conversation with @{selectedConversation.senderUsername}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {selectedConversation.messages
                  .sort((a: any, b: any) => a.timestamp - b.timestamp)
                  .map((message: any) => (
                    <div key={message._id} className="space-y-2">
                      {/* Incoming Message */}
                      <div className="flex justify-start">
                        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            @{message.senderUsername}
                          </p>
                          <p className="text-sm mt-1">{message.text}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {/* Auto-Reply */}
                      {message.replyText && (
                        <div className="flex justify-end">
                          <div className="bg-blue-600 text-white rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm font-semibold">Auto-Reply</p>
                            <p className="text-sm mt-1">{message.replyText}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-80">
                                {message.repliedAt
                                  ? new Date(message.repliedAt).toLocaleTimeString()
                                  : "Sending..."}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  message.status === "sent"
                                    ? "bg-green-500"
                                    : message.status === "failed"
                                    ? "bg-red-500"
                                    : "bg-yellow-500"
                                }`}
                              >
                                {message.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">
                Select a conversation to view messages
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}