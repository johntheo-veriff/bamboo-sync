import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { db } from "@/lib/firebase-admin";
import { generateCsrfToken } from "@/lib/csrf";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UpdateApiKeyForm, DisconnectButton } from "./actions";

function formatNextSync(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

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

  const store = createFirebaseConnectionStore(db);
  const connection = await store.get(googleAccountId);

  if (!connection) {
    redirect("/connect");
  }

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-4">

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Bamboo Sync</h1>
              <p className="text-gray-400 text-sm mt-0.5">{connection.bambooSubdomain}.bamboohr.com</p>
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
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
            <span className="ml-2 text-gray-700">{nextSyncLabel}</span>
          </div>
        </div>

        {/* Settings card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Update API key</p>
            <UpdateApiKeyForm csrfToken={csrfToken} />
          </div>

          <hr className="border-gray-100" />

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Disconnect</p>
            <p className="text-sm text-gray-400 mb-3">
              Removes all bamboo-sync calendar events and unlinks your account.
            </p>
            <DisconnectButton csrfToken={csrfToken} />
          </div>
        </div>

      </div>
    </div>
  );
}
