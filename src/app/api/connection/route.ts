import { getStores } from "@/lib/stores";
import {
  deleteEvent,
  listBambooSyncEvents,
} from "@/modules/google-calendar-client";
import { buildGoogleCalendarConfig } from "@/lib/google-config";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (!googleAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { connectionStore } = getStores();
  const connection = await connectionStore.get(googleAccountId);

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

  const { connectionStore } = getStores();
  const connection = await connectionStore.get(googleAccountId);

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const deleteEvents = new URL(request.url).searchParams.get("deleteEvents") === "true";

  if (deleteEvents) {
    try {
      const calendarConfig = buildGoogleCalendarConfig(connection, connectionStore);
      const events = await listBambooSyncEvents(calendarConfig);
      await Promise.all(events.map((event) => deleteEvent(calendarConfig, event.googleEventId)));
    } catch (err) {
      console.error("Failed to delete calendar events during disconnect:", err);
    }
  }

  await connectionStore.delete(googleAccountId);

  return new NextResponse(null, { status: 200 });
}

