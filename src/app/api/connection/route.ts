import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { db } from "@/lib/firebase-admin";
import {
  deleteEvent,
  listBambooSyncEvents,
} from "@/modules/google-calendar-client";
import { fetchTimeOffEntries } from "@/modules/bamboo-hr-client";
import { BambooAuthError } from "@/modules/bamboo-hr-client/types";
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

export async function DELETE() {
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

  // Delete all bamboo-sync calendar events
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

  const events = await listBambooSyncEvents(calendarConfig);
  await Promise.all(events.map((event) => deleteEvent(calendarConfig, event.googleEventId)));

  // Delete the connection from Firestore
  await store.delete(googleAccountId);

  // Clear the google-account-id cookie
  cookieStore.delete("google-account-id");

  return new NextResponse(null, { status: 200 });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (!googleAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { apiKey } = body;
  if (!apiKey) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  const store = connectionStore();
  const connection = await store.get(googleAccountId);

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Validate the new API key against BambooHR
  try {
    await fetchTimeOffEntries({ subdomain: connection.bambooSubdomain, apiKey });
  } catch (err) {
    if (err instanceof BambooAuthError) {
      return NextResponse.json({ error: "Invalid BambooHR API key" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not reach BambooHR" }, { status: 502 });
  }

  // Update the connection with the new API key
  await store.save({ ...connection, bambooApiKey: apiKey });

  return new NextResponse(null, { status: 200 });
}
