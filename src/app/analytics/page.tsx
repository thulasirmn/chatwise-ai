"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";

export default function AnalyticsPage() {
  const { userId } = useAuth();
  // Example queries (replace with real analytics queries)
  const stats = useQuery(api.analytics.getStats, { userId: userId ?? "" });

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total DMs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.dmCount ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.commentCount ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Auto-Replies Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.autoReplyCount ?? "-"}</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Recent Activity</h2>
        <div className="space-y-2">
          {stats?.recentEvents?.length ? (
            stats.recentEvents.map((event: any, idx: number) => (
              <Card key={idx}>
                <CardContent className="py-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{event.type}</span>
                    <span className="text-xs text-zinc-500">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">{event.text}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-zinc-500">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}
