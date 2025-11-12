"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRule, setNewRule] = useState({ pattern: "", replyText: "", type: "dm" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/instagram/status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to load status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    setMessage("");
    try {
      const res = await fetch("/api/instagram/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage("✅ Page subscribed successfully!");
      } else {
        setMessage("❌ " + (data.error || "Failed to subscribe"));
      }
    } catch (err: any) {
      setMessage("❌ " + err.message);
    } finally {
      setSubscribing(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage("");
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("✅ Rule created successfully!");
        setNewRule({ pattern: "", replyText: "", type: "dm" });
        loadStatus();
      } else {
        setMessage("❌ " + (data.error || "Failed to create rule"));
      }
    } catch (err: any) {
      setMessage("❌ " + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
        <div className="max-w-4xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Instagram Not Connected</h2>
            <p className="mb-4">Please connect your Instagram account first.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Settings</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600"
          >
            ← Back to Dashboard
          </button>
        </div>

        {message && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            {message}
          </div>
        )}

        {/* Account Status */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">Account Status</h2>
            <button
              onClick={async () => {
                if (confirm("Disconnect and reconnect Instagram? You'll need to authorize again.")) {
                  try {
                    await fetch("/api/instagram/disconnect", { method: "POST" });
                    router.push("/dashboard");
                  } catch (err) {
                    alert("Failed to disconnect. Please try again.");
                  }
                }
              }}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reconnect Instagram
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Instagram ID:</span> {status.account.instagram_account_id}
            </p>
            <p>
              <span className="font-semibold">Page ID:</span> {status.account.instagram_page_id}
            </p>
            <p>
              <span className="font-semibold">Token Status:</span>{" "}
              {status.account.token_expired ? (
                <span className="text-red-600">Expired - Reconnect Required</span>
              ) : (
                <span className="text-green-600">Active</span>
              )}
            </p>
            <p>
              <span className="font-semibold">Auto-Reply:</span>{" "}
              {status.settings.auto_reply_enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
            <p className="font-semibold mb-1">Need to update permissions?</p>
            <p className="text-xs">
              1. Remove the app from{" "}
              <a
                href="https://www.facebook.com/settings?tab=business_tools"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Facebook Business Integrations
              </a>
            </p>
            <p className="text-xs">2. Click "Reconnect Instagram" above</p>
            <p className="text-xs">3. In the dialog, click "Edit Settings" and approve all permissions</p>
          </div>
        </div>

        {/* Webhook Subscription */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Webhook Subscription</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Subscribe your Facebook Page to receive Instagram DM and comment events.
          </p>
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {subscribing ? "Subscribing..." : "Subscribe Page"}
          </button>
        </div>

        {/* Create Rule */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Create Auto-Reply Rule</h2>
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={newRule.type}
                onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700"
              >
                <option value="dm">Direct Message</option>
                <option value="comment">Comment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Pattern (trigger word/phrase)</label>
              <input
                type="text"
                value={newRule.pattern}
                onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                placeholder="e.g., hi, price, help"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reply Text</label>
              <textarea
                value={newRule.replyText}
                onChange={(e) => setNewRule({ ...newRule, replyText: e.target.value })}
                placeholder="e.g., Thanks for reaching out!"
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700"
                required
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Rule"}
            </button>
          </form>
        </div>

        {/* Existing Rules */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Auto-Reply Rules ({status.rules.active} active of {status.rules.count} total)
          </h2>
          {status.rules.count === 0 ? (
            <p className="text-zinc-500">No rules created yet.</p>
          ) : (
            <div className="space-y-3">
              {status.rules.sample.map((rule: any, idx: number) => (
                <div key={idx} className="border border-zinc-200 dark:border-zinc-700 rounded p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {rule.type === "dm" ? "📩 DM" : "💬 Comment"} • Pattern: "{rule.pattern}"
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Reply: {rule.reply}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        rule.enabled
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : "bg-zinc-200 dark:bg-zinc-700"
                      }`}
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Events</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Messages ({status.recent_events.messages.length})</h3>
              {status.recent_events.messages.length === 0 ? (
                <p className="text-sm text-zinc-500">No messages yet</p>
              ) : (
                <div className="space-y-2">
                  {status.recent_events.messages.map((msg: any, idx: number) => (
                    <div key={idx} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                      <p className="font-medium">{msg.sender}</p>
                      <p className="text-zinc-600 dark:text-zinc-400">{msg.text}</p>
                      <p className="text-xs text-zinc-500">{msg.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Comments ({status.recent_events.comments.length})</h3>
              {status.recent_events.comments.length === 0 ? (
                <p className="text-sm text-zinc-500">No comments yet</p>
              ) : (
                <div className="space-y-2">
                  {status.recent_events.comments.map((cmt: any, idx: number) => (
                    <div key={idx} className="text-sm border-l-2 border-purple-500 pl-3 py-1">
                      <p className="font-medium">{cmt.author}</p>
                      <p className="text-zinc-600 dark:text-zinc-400">{cmt.text}</p>
                      <p className="text-xs text-zinc-500">{cmt.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
