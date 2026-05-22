"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  session_expired: "Session expired. Please start again.",
  google_cancelled: "Google sign-in was cancelled. Please try again.",
  connection_failed: "Something went wrong connecting your accounts. Please try again.",
};

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [subdomain, setSubdomain] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError ? (ERROR_MESSAGES[urlError] ?? "An error occurred.") : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/bamboo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, apiKey }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Validation failed. Check your credentials.");
      setLoading(false);
      return;
    }

    // Credentials validated — proceed to Google OAuth
    router.push("/api/auth/google");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">bamboo-sync</h1>
        <p className="text-gray-500 text-sm mb-8">
          Connect your BambooHR calendar to Google Calendar so colleagues always know when you&apos;re away.
        </p>

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
            {loading ? "Validating…" : "Connect BambooHR"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
