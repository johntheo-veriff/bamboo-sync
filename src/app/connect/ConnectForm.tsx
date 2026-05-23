"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WhosOutEntry } from "@/modules/bamboo-hr-client/types";

interface PreviewData {
  timeOffEntries: WhosOutEntry[];
  holidays: { name: string; startDate: string }[];
  holidayCount: number;
  nextHoliday: { name: string; startDate: string } | null;
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

function SyncPreview({
  subdomain,
  apiKey,
  preview,
  onBack,
}: {
  subdomain: string;
  apiKey: string;
  preview: PreviewData;
  onBack: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/bamboo/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, apiKey }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Connection failed. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/management");
  }

  const { timeOffEntries, holidayCount, holidays } = preview;
  const hasAnything = timeOffEntries.length > 0 || holidayCount > 0;

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">What will be synced</h1>
        <p className="text-gray-500 text-sm">
          Review the upcoming entries that will be added to your Google Calendar.
        </p>
      </div>

      {!hasAnything ? (
        <div className="mb-6 rounded-lg bg-gray-50 border border-gray-200 px-4 py-5 text-sm text-gray-500">
          No upcoming time-off entries or holidays found. Future entries will be synced automatically once they appear in BambooHR.
        </div>
      ) : (
        <div className="mb-6 space-y-5">
          {/* Time-off entries */}
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
                    <span className="text-gray-700">{entry.name}</span>
                    <span className="text-gray-400 ml-4 flex-shrink-0">
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Holidays */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Holidays ({holidayCount})
            </p>
            {holidayCount === 0 ? (
              <p className="text-sm text-gray-400 italic">None found</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {preview.holidays.map((h, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{h.name}</span>
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

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? "Connecting…" : "Start syncing"}
        </button>
      </div>
    </div>
  );
}

export default function ConnectForm({ defaultSubdomain }: { defaultSubdomain: string }) {
  const [subdomain, setSubdomain] = useState(defaultSubdomain);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  if (preview) {
    return (
      <SyncPreview
        subdomain={subdomain}
        apiKey={apiKey}
        preview={preview}
        onBack={() => setPreview(null)}
      />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/bamboo/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, apiKey }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Connection failed. Check your credentials.");
      setLoading(false);
      return;
    }

    const data = await res.json() as PreviewData;
    setPreview(data);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Connect BambooHR</h1>
        <p className="text-gray-500 text-sm">
          Enter your BambooHR credentials to start syncing time-off to your calendar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            BambooHR subdomain
          </label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
            <input
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="yourcompany"
              required
              className="flex-1 px-3 py-2 text-sm outline-none"
            />
            <span className="bg-gray-50 px-3 py-2 text-sm text-gray-400 border-l border-gray-300">
              .bamboohr.com
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            BambooHR API key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your personal API key"
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400">
            Generate one in BambooHR → your profile → API Keys.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? "Loading preview…" : "Connect BambooHR"}
        </button>
      </form>
    </div>
  );
}
