"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

const COMMON_TIMEZONES = [
  "Africa/Cairo", "Africa/Johannesburg", "America/Anchorage", "America/Argentina/Buenos_Aires",
  "America/Bogota", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Mexico_City", "America/New_York", "America/Sao_Paulo", "America/Toronto",
  "America/Vancouver", "Asia/Bangkok", "Asia/Colombo", "Asia/Dubai", "Asia/Hong_Kong",
  "Asia/Jakarta", "Asia/Karachi", "Asia/Kolkata", "Asia/Kuala_Lumpur", "Asia/Manila",
  "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Taipei", "Asia/Tehran",
  "Asia/Tokyo", "Australia/Melbourne", "Australia/Perth", "Australia/Sydney",
  "Europe/Amsterdam", "Europe/Athens", "Europe/Berlin", "Europe/Brussels",
  "Europe/Budapest", "Europe/Copenhagen", "Europe/Dublin", "Europe/Helsinki",
  "Europe/Istanbul", "Europe/Lisbon", "Europe/London", "Europe/Madrid",
  "Europe/Moscow", "Europe/Oslo", "Europe/Paris", "Europe/Prague",
  "Europe/Rome", "Europe/Stockholm", "Europe/Tallinn", "Europe/Vienna",
  "Europe/Warsaw", "Europe/Zurich", "Pacific/Auckland", "Pacific/Honolulu",
  "Pacific/Sydney", "UTC",
];

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
    if (lastSyncedAt) fetchEvents();
  }, [lastSyncedAt, fetchEvents]);

  useEffect(() => {
    const handler = () => fetchEvents();
    window.addEventListener("bamboo-events-changed", handler);
    return () => window.removeEventListener("bamboo-events-changed", handler);
  }, [fetchEvents]);

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

export function TimezoneSelector({ savedTimezone }: { savedTimezone?: string }) {
  const router = useRouter();
  const browserTz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;

  const [selected, setSelected] = useState(savedTimezone ?? browserTz ?? "UTC");
  const [persisted, setPersisted] = useState(savedTimezone);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const allTimezones = useMemo<string[]>(() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      return COMMON_TIMEZONES;
    }
  }, []);

  const filtered = useMemo(() => {
    if (!query) return allTimezones;
    const q = query.toLowerCase();
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q));
  }, [allTimezones, query]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  function handleSelect(tz: string) {
    setSelected(tz);
    setQuery("");
    setOpen(false);
    setSuccess(false);
    setError(null);
  }

  async function handleSave() {
    setLoading(true);
    setSuccess(false);
    setError(null);

    // Clear existing events first so they get recreated with the new timezone.
    // A plain sync would skip them (the diff sees no content change).
    const clearRes = await fetch("/api/sync/events", { method: "DELETE" });
    if (!clearRes.ok) {
      setError("Failed to clear existing events.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userTimezone: selected }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Failed to sync.");
      return;
    }

    setPersisted(selected);
    setSuccess(true);
    router.refresh();
    window.dispatchEvent(new Event("bamboo-events-changed"));
  }

  const isDirty = selected !== persisted;

  return (
    <div>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors text-left"
        >
          <span className="text-[#1C2B2A]">{selected}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col">
            <div className="p-2 border-b border-gray-100">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search timezones…"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00E5CC]"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-400">No results</p>
              ) : (
                filtered.map((tz) => (
                  <button
                    key={tz}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(tz)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                      tz === selected
                        ? "bg-[#F0FDFB] text-[#1C2B2A] font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{tz}</span>
                    {tz === browserTz && (
                      <span className="text-xs text-gray-400 flex-shrink-0">browser default</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-2 text-sm text-[#00897B] bg-[#F0FDFB] border border-[#CCFAF5] rounded-lg px-3 py-2">
          Timezone saved and calendar re-synced.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={loading || !isDirty}
        className="mt-3 py-2 px-4 bg-[#00E5CC] hover:bg-[#00CDB8] disabled:opacity-50 disabled:cursor-not-allowed text-[#1C2B2A] text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? "Saving…" : "Save timezone"}
      </button>
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

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Sync failed.");
      setLoading(false);
      return;
    }

    router.refresh();
    window.dispatchEvent(new Event("bamboo-events-changed"));
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
    window.dispatchEvent(new Event("bamboo-events-changed"));
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

export function DangerZone() {
  const router = useRouter();
  const [loading, setLoading] = useState<"disconnect" | "disconnect-delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect(deleteEvents: boolean) {
    setLoading(deleteEvents ? "disconnect-delete" : "disconnect");
    setError(null);

    const url = deleteEvents ? "/api/connection?deleteEvents=true" : "/api/connection";
    const res = await fetch(url, { method: "DELETE" });

    if (!res.ok) {
      setError("Failed to disconnect. Please try again.");
      setLoading(null);
      return;
    }

    router.push("/");
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#1C2B2A]">Disconnect</p>
          <p className="text-sm text-gray-400 mt-0.5">Stop syncing. Keeps existing calendar events.</p>
        </div>
        <button
          onClick={() => handleDisconnect(false)}
          disabled={loading !== null}
          className="flex-shrink-0 py-2 px-4 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 text-sm font-medium rounded-lg border border-red-200 transition-colors"
        >
          {loading === "disconnect" ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
      <div className="border-t border-red-50 pt-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#1C2B2A]">Disconnect &amp; delete</p>
          <p className="text-sm text-gray-400 mt-0.5">Stop syncing and remove all synced events.</p>
        </div>
        <button
          onClick={() => handleDisconnect(true)}
          disabled={loading !== null}
          className="flex-shrink-0 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading === "disconnect-delete" ? "Disconnecting…" : "Disconnect & delete"}
        </button>
      </div>
    </div>
  );
}
