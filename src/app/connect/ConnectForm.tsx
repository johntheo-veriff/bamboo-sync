"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WhosOutEntry } from "@/modules/bamboo-hr-client/types";

type Step = "preview" | "connecting";

interface PreviewData {
  timeOffEntries: WhosOutEntry[];
  holidays: { name: string; startDate: string }[];
  holidayCount: number;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function GoogleCalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="flex-shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.13 17.64 11.82 17.64 9.2Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

export default function ConnectForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("preview");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function handleConnect() {
    setStep("connecting");
    setError(null);

    const res = await fetch("/api/auth/bamboo/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Connection failed. Please try again.");
      setStep("preview");
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
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-sm text-gray-400 hover:text-[#1C2B2A] transition-colors"
        >
          ← Back
        </button>
      </div>
    );
  }

  const { timeOffEntries = [], holidays = [], holidayCount = 0 } = preview ?? {};
  const totalEvents = timeOffEntries.length + holidayCount;
  const nextHoliday = holidays[0];
  const isConnecting = step === "connecting";

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1C2B2A] mb-2">Sync Preview</h1>
        <p className="text-gray-500 text-sm">
          Here&apos;s what will be added to your Google Calendar when you connect.
        </p>
      </div>

      {/* Time-off entries */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Time-off entries
        </p>
        {timeOffEntries.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No upcoming time-off</p>
        ) : (
          <ul className="space-y-1.5">
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

      {/* Holidays summary */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Holidays
        </p>
        {holidayCount === 0 ? (
          <p className="text-sm text-gray-400 italic">No holidays found</p>
        ) : (
          <p className="text-sm text-[#1C2B2A]">
            {holidayCount} {holidayCount === 1 ? "holiday" : "holidays"}
            {nextHoliday && (
              <span className="text-gray-400">
                , next: {nextHoliday.name} ({formatDate(nextHoliday.startDate)})
              </span>
            )}
          </p>
        )}
      </div>

      {/* Total count */}
      {totalEvents > 0 && (
        <div className="mb-6 rounded-lg bg-[#F0FDFB] border border-[#CCFAF5] px-4 py-3">
          <p className="text-sm text-[#1C2B2A]">
            <span className="font-semibold">{totalEvents}</span>{" "}
            {totalEvents === 1 ? "event" : "events"} will be synced to your calendar
          </p>
        </div>
      )}

      {totalEvents === 0 && (
        <div className="mb-6 rounded-lg bg-gray-50 border border-gray-100 px-4 py-4 text-sm text-gray-500">
          No upcoming entries found. Future events will sync automatically once they appear in BambooHR.
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Actions */}
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#00E5CC] hover:bg-[#00CDB6] disabled:opacity-50 text-[#1C2B2A] text-sm font-semibold rounded-lg transition-colors"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-[#1C2B2A] border-t-transparent animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <GoogleCalendarIcon />
            Connect Google Calendar
          </>
        )}
      </button>

      <div className="mt-4 text-center">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-400 hover:text-[#1C2B2A] transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
