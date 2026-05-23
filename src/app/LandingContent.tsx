"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VeriffLogo } from "@/components/VeriffLogo";

const ERROR_MESSAGES: Record<string, string> = {
  session_expired: "Session expired. Please sign in again.",
  google_cancelled: "Google sign-in was cancelled.",
  connection_failed: "Something went wrong. Please try again.",
  unauthorized_domain: "Access restricted to Veriff accounts.",
};

function LandingPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const error = urlError ? (ERROR_MESSAGES[urlError] ?? "An error occurred.") : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <VeriffLogo size={36} />
            <span className="text-lg font-semibold text-[#1C2B2A]">Veriff</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1C2B2A] mb-2">BambooHR Sync</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Automatically syncs your time-off and company holidays from BambooHR into your Google Calendar.
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-3 w-full py-2.5 px-4 bg-[#00E5CC] hover:bg-[#00CDB6] text-[#1C2B2A] text-sm font-semibold rounded-lg transition-colors"
        >
          <GoogleIcon />
          Sign in with Google
        </a>
        <p className="mt-3 text-center text-xs text-gray-400">Veriff accounts only</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.13 17.64 11.82 17.64 9.2Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

export default function LandingContent() {
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  );
}
