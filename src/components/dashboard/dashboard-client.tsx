"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CommentsTab from "@/components/dashboard/comments-tab";
import MessagesTab from "@/components/dashboard/messages-tab";
import AnalyticsTab from "@/components/dashboard/analytics-tab";
import { useRouter } from "next/navigation";

export default function DashboardClient({ userData }: { userData: any }) {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage your Instagram interactions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/settings")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Settings
          </button>
        </div>
      </div>

      <Tabs defaultValue="comments">
        <TabsList>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="comments">
          <CommentsTab />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}