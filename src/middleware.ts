import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(request: NextRequest) {
  const { userId } = getAuth(request);
  
  // Allow public routes
  const publicUrls = ["/", "/api/webhook", "/sign-in", "/sign-up"];
  if (publicUrls.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // If user is not signed in and trying to access a protected route
  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

// See https://clerk.com/docs/nextjs/middleware for more information about configuring your middleware
export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)"
  ],
};