"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function InstagramCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const connectInstagram = useMutation(api.users.connectInstagramAccount);

  // Ref + sessionStorage guard to avoid exchanging the same code multiple times (36009 reused code error)
  const exchangedRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");

        if (errorParam) {
          setError(`Instagram OAuth error: ${errorParam}`);
          setLoading(false);
          return;
        }

        if (!code) {
          setError("No authorization code received from Instagram");
          setLoading(false);
          return;
        }

        if (!userId) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        // Extract state to get appId
        const stateParam = searchParams.get("state");
        let appId = null;
        try {
          const stateData = stateParam ? JSON.parse(stateParam) : {};
          appId = stateData.appId;
        } catch (e) {
          console.error("Failed to parse state:", e);
        }

        // Prevent duplicate processing of same code across React strict mode rerenders or user refreshes
        const guardKey = `ig_code_exchanged_${code}`;
        if (exchangedRef.current || (typeof window !== 'undefined' && sessionStorage.getItem(guardKey))) {
          setLoading(false);
          return; // already processed
        }

        // Exchange the code for an access token and get Instagram account first
        const response = await fetch("/api/instagram/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, userId, appId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Surface clearer reused-code guidance
          if (errorText.includes("error_subcode\":36009") || /authorization code has been used/i.test(errorText)) {
            setError("Authorization code already used. Please restart the connection by clicking 'Connect Instagram' again.");
          } else {
            // Optional: fall back to debug endpoint for richer diagnostics (will consume the code)
            try {
              const debugResponse = await fetch("/api/instagram/debug", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, userId, appId }),
              });
              const debugData = await debugResponse.json();
              console.log("=== DEBUG TOKEN INFO ===", JSON.stringify(debugData, null, 2));
              setError(`Failed to exchange token: ${errorText}\nDebug: ${JSON.stringify({
                scopes: debugData.debug_token?.scopes,
                permissions: debugData.permissions,
                me: debugData.me,
                accounts: debugData.accounts,
                assigned_pages: debugData.assigned_pages,
              }, null, 2)}`);
            } catch {
              setError(`Failed to exchange token: ${errorText}`);
            }
          }
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.instagram_account_id) {
          setError("No Instagram Business account found. Please connect a Facebook Page with an Instagram Business account.");
          setLoading(false);
          return;
        }

        // Save the Instagram Business account details to Convex
        await connectInstagram({
          userId,
            instagramAccountId: data.instagram_account_id,
            accessToken: data.access_token,
            pageId: data.page_id,
            tokenExpiresAt: data.token_expires_at,
        });

        // Mark as exchanged
        exchangedRef.current = true;
        if (typeof window !== 'undefined') sessionStorage.setItem(guardKey, '1');

        // Redirect to dashboard
        router.push("/dashboard");
      } catch (err: any) {
        setError(err.message || "An unknown error occurred");
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, userId, connectInstagram, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Connecting your Instagram account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-8 bg-white dark:bg-zinc-800 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Failed</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
