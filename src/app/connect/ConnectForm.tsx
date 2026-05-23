"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WhosOutEntry } from "@/modules/bamboo-hr-client/types";

interface PreviewData {
  timeOffEntries: WhosOutEntry[];
  holidays: { name: string; startDate: string }[];
  holidayCount: number;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatDateRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
}

export default function ConnectForm() {
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/bamboo/preview")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Could not load preview.");
        }
        return res.json() as Promise<PreviewData>;
      })
      .then(setPreview)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleConfirm() {
    setConnecting(true);
    setError(null);

    const res = await fetch("/api/auth/bamboo/connect", { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Connection failed. Please try again.");
      setConnecting(false);
      return;
    }

    router.push("/management");
  }

  if (loading) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00E5CC] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Loading your BambooHR data…</p>
        </div>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      </div>
    );
  }

  const { timeOffEntries = [], holidays = [], holidayCount = 0 } = preview ?? {};
  const hasAnything = timeOffEntries.length > 0 || holidayCount > 0;

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1C2B2A] mb-2">What will be synced</h1>
        <p className="text-gray-500 text-sm">
          Review the upcoming entries that will be added to your Google Calendar.
        </p>
      </div>

      {!hasAnything ? (
        <div className="mb-6 rounded-lg bg-gray-50 border border-gray-100 px-4 py-5 text-sm text-gray-500">
          No upcoming time-off or holidays found. Future entries will sync automatically once they appear in BambooHR.
        </div>
      ) : (
        <div className="mb-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Time-off entries ({timeOffEntries.length})
            </p>
            {timeOffEntries.length === 0 ? (
              <p className="text-sm text-gray-400 italic">None upcoming</p>
            ) : (
              <ul className="space-y-1">
                {timeOffEntries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#1C2B2A]">{entry.name}</span>
                    <span className="text-gray-400 ml-4 flex-shrink-0">
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Holidays ({holidayCount})
            </p>
            {holidayCount === 0 ? (
              <p className="text-sm text-gray-400 italic">None found</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {holidays.map((h, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[#1C2B2A]">{h.name}</span>
                    <span className="text-gray-400 ml-4 flex-shrink-0">{formatDate(h.startDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={connecting}
        className="w-full py-2.5 px-4 bg-[#00E5CC] hover:bg-[#00CDB6] disabled:opacity-50 text-[#1C2B2A] text-sm font-semibold rounded-lg transition-colors"
      >
        {connecting ? "Connecting…" : "Start syncing"}
      </button>
    </div>
  );
}
