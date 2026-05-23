import { db } from "@/lib/firebase-admin";
import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { createFirebaseGoogleIdentityStore } from "@/modules/google-identity-store/firebase-adapter";
import { runSync } from "@/modules/sync-runner";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;
  const tokensRaw = cookieStore.get("google-tokens")?.value;

  if (!googleAccountId || !tokensRaw) {
    return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });
  }

  let tokens: { accessToken: string; refreshToken: string };
  try {
    tokens = JSON.parse(tokensRaw);
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const subdomain = process.env.BAMBOOHR_SUBDOMAIN;
  const apiKey = process.env.BAMBOOHR_API_KEY;
  if (!subdomain || !apiKey) {
    return NextResponse.json({ error: "BambooHR not configured" }, { status: 500 });
  }

  const identityStore = createFirebaseGoogleIdentityStore(db);
  const identity = await identityStore.get(googleAccountId);
  const userEmail = identity?.email ?? "";

  const store = createFirebaseConnectionStore(db);
  const connection = {
    googleAccountId,
    userEmail,
    bambooSubdomain: subdomain,
    bambooApiKey: apiKey,
    googleAccessToken: tokens.accessToken,
    googleRefreshToken: tokens.refreshToken,
    lastSyncStatus: "pending" as const,
    lastSyncError: null,
    nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  await store.save(connection);
  runSync(connection, store).catch(console.error);

  cookieStore.delete("google-tokens");

  return NextResponse.json({ success: true });
}
