"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncNowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/sync", { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Sync failed.");
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="py-2 px-4 bg-[#00E5CC] hover:bg-[#00CDB8] disabled:opacity-50 text-[#1C2B2A] text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}

export function UpdateApiKeyForm({ csrfToken }: { csrfToken: string }) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/connection", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ apiKey }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Failed to update API key.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setApiKey("");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          New BambooHR API key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your new API key"
          required
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          API key updated successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? "Updating…" : "Update"}
      </button>
    </form>
  );
}

export function DisconnectButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/connection", {
      method: "DELETE",
    });

    if (!res.ok) {
      setError("Failed to disconnect. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="py-2 px-4 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 text-sm font-medium rounded-lg border border-red-300 transition-colors"
      >
        {loading ? "Disconnecting…" : "Disconnect"}
      </button>
    </div>
  );
}
