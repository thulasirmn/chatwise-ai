"use client";

import React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";

export function InstagramConnect() {
  const { userId } = useAuth();
  const setFacebookApp = useMutation(api.users.setFacebookApp);
  const [appId, setAppId] = React.useState("");
  const [appSecret, setAppSecret] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleConnect = async () => {
    setError(null);
    if (!appId || !appSecret) {
      setError("Please enter both App ID and App Secret.");
      return;
    }
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;
    if (!redirectUri) {
      setError("Redirect URI missing. Set NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI in .env.local");
      return;
    }

    setLoading(true);
    try {
      if (!userId) {
        setError("You must be signed in to connect Instagram");
        setLoading(false);
        return;
      }

      // Persist per-user app credentials
      await setFacebookApp({ userId, facebookAppId: appId, facebookAppSecret: appSecret });

      const permissions = [
        "instagram_basic",
        "instagram_manage_comments",
        "instagram_manage_messages",
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_metadata",
        "pages_messaging"
      ];
      const scope = permissions.join(",");
      const statePayload = JSON.stringify({ ts: Date.now(), appId });
      // auth_type=rerequest forces Facebook to show the permissions and page selection again
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${encodeURIComponent(statePayload)}&auth_type=rerequest`;
      window.location.href = authUrl;
    } catch (e: any) {
      setError(e.message || "Failed to start OAuth");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-zinc-800 rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Connect Instagram
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Connect your Instagram Business account to start automating replies
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Facebook App ID</label>
            <input
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="123456789012345"
              className="w-full rounded-md border px-3 py-2 bg-white dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Facebook App Secret</label>
            <input
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="app_secret_here"
              type="password"
              className="w-full rounded-md border px-3 py-2 bg-white dark:bg-zinc-900"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Redirecting..." : "Connect Instagram Account"}
          </button>
          <p className="text-xs text-zinc-500">
            Don’t have an app? Follow: developers.facebook.com → Create App (Business) → Add Instagram + Facebook Login → Add OAuth redirect URI: {process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI}
          </p>
        </div>
      </div>
    </div>
  );
}