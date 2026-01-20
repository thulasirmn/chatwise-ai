import type { NextConfig } from "next";

// Allow loading Next assets from our tunnel origin during development
const tunnelOrigin = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI
  ? (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI).origin;
      } catch {
        return undefined;
      }
    })()
  : undefined;

const nextConfig: NextConfig = {
  // Reduce Next.js dev warnings when accessing via tunnel domain
  allowedDevOrigins: tunnelOrigin ? [tunnelOrigin] : undefined,
  
  // Empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;
