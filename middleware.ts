import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// Single middleware that runs Clerk and adds tunnel bypass headers on all responses
export default clerkMiddleware((auth, req) => {
  const res = NextResponse.next();
  // This header helps skip ngrok's browser interstitial for subsequent requests
  res.headers.set("ngrok-skip-browser-warning", "true");
  // Add headers to prevent caching and connection issues through tunnel
  res.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.headers.set("Connection", "keep-alive");
  return res;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};