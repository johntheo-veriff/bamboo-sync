import { db } from "@/lib/firebase-admin";
import { fetchWhosOut } from "@/modules/bamboo-hr-client";
import { BambooAuthError } from "@/modules/bamboo-hr-client/types";
import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { createFirebaseGoogleIdentityStore } from "@/modules/google-identity-store/firebase-adapter";
import { runSync } from "@/modules/sync-runner";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  let body: { subdomain?: string; apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { subdomain, apiKey } = body;
  if (!subdomain || !apiKey) {
    return NextResponse.json({ error: "subdomain and apiKey are required" }, { status: 400 });
  }

  try {
    await fetchWhosOut({ subdomain, apiKey });
  } catch (err) {
    if (err instanceof BambooAuthError) {
      return NextResponse.json({ error: "Invalid BambooHR API key or subdomain" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not reach BambooHR" }, { status: 502 });
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
