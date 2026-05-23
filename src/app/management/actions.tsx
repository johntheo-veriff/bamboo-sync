"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SyncedEvent {
  googleEventId: string;
  bambooId: string;
  type: "time-off" | "holiday";
  name: string;
  startDate: string;
  endDate: string;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return start === end ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
}

export function SyncedEventsPanel({ lastSyncedAt }: { lastSyncedAt?: string }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<SyncedEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/events");
      if (!res.ok) throw new Error("Failed to load events");
      const data = (await res.json()) as { events: SyncedEvent[] };
      setEvents(data.events.sort((a, b) => a.startDate.localeCompare(b.startDate)));
    } catch {
      setError("Could not load synced events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && events === null) fetchEvents();
  }, [open, events, fetchEvents]);

  // Refetch when a new sync completes
  useEffect(() => {
    if (lastSyncedAt && open) {
      setEvents(null);
    }
  }, [lastSyncedAt, open]);

  const holidays = events?.filter((e) => e.type === "holiday") ?? [];
  const timeOff = events?.filter((e) => e.type === "time-off") ?? [];
  const total = events?.length ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-8 py-5 text-left"
      >
        <div>
          <p className="text-sm font-medium text-[#1C2B2A]">Synced events</p>
          {!open && events !== null && (
            <p className="text-xs text-gray-400 mt-0.5">{total} event{total !== 1 ? "s" : ""} in your calendar</p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-8 py-5">
          {loading && <p className="text-sm text-gray-400">Loading…</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {events !== null && !loading && (
            <div className="space-y-5">
              {holidays.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Holidays ({holidays.length})
                  </p>
                  <ul className="space-y-1.5">
                    {holidays.map((e) => (
                      <li key={e.googleEventId} className="flex justify-between text-sm">
                        <span className="text-[#1C2B2A]">{e.name}</span>
                        <span className="text-gray-400 tabular-nums">
                          {formatDateRange(e.startDate, e.endDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {timeOff.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Time-off ({timeOff.length})
                  </p>
                  <ul className="space-y-1.5">
                    {timeOff.map((e) => (
                      <li key={e.googleEventId} className="flex justify-between text-sm">
                        <span className="text-[#1C2B2A]">{e.name}</span>
                        <span className="text-gray-400 tabular-nums">
                          {formatDateRange(e.startDate, e.endDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {total === 0 && (
                <p className="text-sm text-gray-400">No events synced yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
