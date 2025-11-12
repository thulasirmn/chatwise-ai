import type { NextConfig } from "next";

// Allow loading Next assets from our ngrok origin during development
const ngrokOrigin = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI
  ? (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI).origin;
      } catch {
        return undefined;
      }
    })()
  : undefined;

const nextConfig: NextConfig = {
  // Reduce Next.js dev warnings when accessing via ngrok domain
  allowedDevOrigins: ngrokOrigin ? [ngrokOrigin] : undefined,
};

export default nextConfig;
