"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [events, setEvents] = useState<SyncedEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (lastSyncedAt) setEvents(null);
  }, [lastSyncedAt]);

  useEffect(() => {
    if (events === null && !loading) fetchEvents();
  }, [events, loading, fetchEvents]);

  const holidays = events?.filter((e) => e.type === "holiday") ?? [];
  const timeOff = events?.filter((e) => e.type === "time-off") ?? [];
  const total = events?.length ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-[#1C2B2A]">Synced events</p>
        {events !== null && !loading && (
          <span className="text-xs text-gray-400 tabular-nums">
            {total} {total !== 1 ? "events" : "event"}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4">
          <div className="w-4 h-4 rounded-full border-2 border-[#00E5CC] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      )}

      {error && <p className="text-sm text-red-500 py-2">{error}</p>}

      {events !== null && !loading && total === 0 && (
        <p className="text-sm text-gray-400 py-2">No events synced yet.</p>
      )}

      {events !== null && !loading && total > 0 && (
        <div
          ref={listRef}
          className="overflow-y-auto max-h-72 -mx-1 px-1 space-y-4"
        >
          {timeOff.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Time-off · {timeOff.length}
              </p>
              <ul className="space-y-2">
                {timeOff.map((e) => (
                  <li key={e.googleEventId} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#1C2B2A] truncate">{e.name}</span>
                    <span className="text-gray-400 tabular-nums flex-shrink-0">
                      {formatDateRange(e.startDate, e.endDate)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {holidays.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Holidays · {holidays.length}
              </p>
              <ul className="space-y-2">
                {holidays.map((e) => (
                  <li key={e.googleEventId} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#1C2B2A] truncate">{e.name}</span>
                    <span className="text-gray-400 tabular-nums flex-shrink-0">
                      {formatDateRange(e.startDate, e.endDate)}
                    </span>
                  </li>
                ))}
              </ul>
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

export function ClearEventsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    setLoading(true);
    setResult(null);
    setError(null);

    const res = await fetch("/api/sync/events", { method: "DELETE" });

    if (!res.ok) {
      setError("Failed to clear events. Please try again.");
      setLoading(false);
      return;
    }

    const data = (await res.json()) as { deleted: number };
    setResult(`${data.deleted} event${data.deleted !== 1 ? "s" : ""} removed.`);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {result && (
        <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          {result}
        </div>
      )}
      <button
        onClick={handleClear}
        disabled={loading}
        className="py-2 px-4 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-600 text-sm font-medium rounded-lg border border-gray-300 transition-colors"
      >
        {loading ? "Clearing…" : "Clear synced events"}
      </button>
    </div>
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
