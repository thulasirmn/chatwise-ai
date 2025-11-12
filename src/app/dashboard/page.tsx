import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { InstagramConnect } from "@/components/instagram-connect";
import { ConvexClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import DashboardClient from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session || !session.userId) {
    redirect("/sign-in");
  }

  // Initialize Convex client
  const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  
  // Get user data
  const userData = await convex.query(api.users.getUser, { userId: session.userId });

  if (!userData?.instagramAccountId) {
    return <InstagramConnect />;
  }

  return <DashboardClient userData={userData} />;
}