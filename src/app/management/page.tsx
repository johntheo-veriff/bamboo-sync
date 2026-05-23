import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { createFirebaseGoogleIdentityStore } from "@/modules/google-identity-store/firebase-adapter";
import { db } from "@/lib/firebase-admin";
import { generateCsrfToken } from "@/lib/csrf";
import { UserAvatar } from "@/components/UserAvatar";
import { VeriffLogo } from "@/components/VeriffLogo";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DisconnectButton } from "./actions";

function formatNextSync(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ManagementPage() {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (!googleAccountId) {
    redirect("/");
  }

  const [connection, identity] = await Promise.all([
    createFirebaseConnectionStore(db).get(googleAccountId),
    createFirebaseGoogleIdentityStore(db).get(googleAccountId),
  ]);

  if (!connection) {
    redirect("/connect");
  }

  const email = identity?.email ?? "";
  const csrfToken = generateCsrfToken();
  cookieStore.set("csrf-token", csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  const isError = connection.lastSyncStatus === "error";
  const isPending = connection.lastSyncStatus === "pending";
  const nextSyncLabel = formatNextSync(connection.nextSyncAt);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <UserAvatar email={email} />
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md space-y-4">

          {/* Header card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <VeriffLogo size={32} />
                <div>
                  <h1 className="text-xl font-semibold text-[#1C2B2A]">BambooHR Sync</h1>
                  <p className="text-gray-400 text-xs mt-0.5">workatveriff.bamboohr.com</p>
                </div>
              </div>
              {isPending ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  Syncing…
                </span>
              ) : isError ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Error
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E6FBF9] text-[#00A896]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5CC]" />
                  Active
                </span>
              )}
            </div>

            {isError && connection.lastSyncError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {connection.lastSyncError}
              </div>
            )}

            <div className="text-sm text-gray-500">
              <span className="text-gray-400">Next sync</span>
              <span className="ml-2 text-[#1C2B2A]">{nextSyncLabel}</span>
            </div>
          </div>

          {/* Disconnect card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <p className="text-sm font-medium text-[#1C2B2A] mb-1">Disconnect</p>
            <p className="text-sm text-gray-400 mb-3">
              Removes all synced calendar events and stops future syncs.
            </p>
            <DisconnectButton csrfToken={csrfToken} />
          </div>

        </div>
      </div>
    </div>
  );
}
