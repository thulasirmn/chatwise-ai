"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentDoc } from "@/convex/types";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

export default function CommentsTab() {
  const { userId } = useAuth();
  const comments = useQuery(api.comments.listRecent, { userId: userId ?? "" }) as CommentDoc[] | undefined;
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  if (!comments) {
    return <div className="text-center py-8">Loading comments...</div>;
  }

  if (comments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            No comments yet. Comments will appear here when users comment on your Instagram posts.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group comments by post
  const postGroups = comments.reduce((groups: any, comment) => {
    const postId = comment.postId;
    if (!groups[postId]) {
      groups[postId] = [];
    }
    groups[postId].push(comment);
    return groups;
  }, {});

  const postIds = Object.keys(postGroups);
  const selectedPost = selectedPostId ? postGroups[selectedPostId] : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Posts List */}
      <div className="md:col-span-1 space-y-2">
        <h3 className="text-sm font-semibold mb-2">Posts with Comments</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {postIds.map((postId) => {
            const postComments = postGroups[postId];
            const commentCount = postComments.length;
            const latestComment = postComments[0];
            
            return (
              <Card
                key={postId}
                className={`cursor-pointer transition-colors ${
                  selectedPostId === postId
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950"
                    : "hover:border-zinc-400"
                }`}
                onClick={() => setSelectedPostId(postId)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">Post {postId.substring(0, 12)}...</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        Latest: {latestComment.text.substring(0, 40)}...
                      </p>
                    </div>
                    <span className="ml-2 bg-purple-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                      {commentCount}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {new Date(latestComment.timestamp).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Comments Thread */}
      <div className="md:col-span-2">
        {selectedPost ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Comments on Post
              </CardTitle>
              <p className="text-sm text-zinc-500">
                Post ID: {selectedPostId}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {selectedPost
                  .sort((a: any, b: any) => a.timestamp - b.timestamp)
                  .map((comment: any) => (
                    <div key={comment._id} className="space-y-2">
                      {/* Original Comment */}
                      <div className="flex justify-start">
                        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            @{comment.authorUsername}
                          </p>
                          <p className="text-sm mt-1">{comment.text}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {new Date(comment.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Auto-Reply */}
                      {comment.replyText && (
                        <div className="flex justify-end">
                          <div className="bg-purple-600 text-white rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm font-semibold">Auto-Reply</p>
                            <p className="text-sm mt-1">{comment.replyText}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-80">
                                {comment.repliedAt
                                  ? new Date(comment.repliedAt).toLocaleTimeString()
                                  : "Sending..."}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  comment.status === "sent"
                                    ? "bg-green-500"
                                    : comment.status === "failed"
                                    ? "bg-red-500"
                                    : "bg-yellow-500"
                                }`}
                              >
                                {comment.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {comment.replyError && (
                        <div className="text-xs text-red-600 dark:text-red-400 text-right">
                          Error: {comment.replyError}
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
                Select a post to view comments and replies
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}