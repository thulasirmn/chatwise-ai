import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const result = await convex.action(api.instagram.syncRecentComments, {
      authUserId: userId,
    });

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error("sync-comments error:", e);
    return NextResponse.json({ error: e.message || "Failed to sync comments" }, { status: 500 });
  }
}
