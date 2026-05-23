import { db } from "@/lib/firebase-admin";
import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { listBambooSyncEvents } from "@/modules/google-calendar-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (!googleAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = createFirebaseConnectionStore(db);
  const connection = await store.get(googleAccountId);

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const calendarConfig = {
    accessToken: connection.googleAccessToken,
    refreshToken: connection.googleRefreshToken,
    onTokenRefresh: async (newTokens: { accessToken: string; refreshToken: string }) => {
      await store.save({
        ...connection,
        googleAccessToken: newTokens.accessToken,
        googleRefreshToken: newTokens.refreshToken,
      });
    },
  };

  try {
    const events = await listBambooSyncEvents(calendarConfig);
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
