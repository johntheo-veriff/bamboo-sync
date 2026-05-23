import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { db } from "@/lib/firebase-admin";
import {
  deleteEvent,
  listBambooSyncEvents,
} from "@/modules/google-calendar-client";
import { buildGoogleCalendarConfig } from "@/lib/google-config";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function connectionStore() {
  return createFirebaseConnectionStore(db);
}

export async function GET() {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (!googleAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = connectionStore();
  const connection = await store.get(googleAccountId);

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  return NextResponse.json({
    bambooSubdomain: connection.bambooSubdomain,
    lastSyncStatus: connection.lastSyncStatus,
    lastSyncError: connection.lastSyncError,
    nextSyncAt: connection.nextSyncAt,
    createdAt: connection.createdAt,
  });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (!googleAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = connectionStore();
  const connection = await store.get(googleAccountId);

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Best-effort: delete all bamboo-sync calendar events.
  // Even if this fails, we still remove the connection so the user is unblocked.
  try {
    const calendarConfig = buildGoogleCalendarConfig(connection, store);
    const events = await listBambooSyncEvents(calendarConfig);
    await Promise.all(events.map((event) => deleteEvent(calendarConfig, event.googleEventId)));
  } catch (err) {
    console.error("Failed to delete calendar events during disconnect:", err);
  }

  await store.delete(googleAccountId);

  return new NextResponse(null, { status: 200 });
}

