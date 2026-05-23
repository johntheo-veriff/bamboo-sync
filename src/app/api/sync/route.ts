import { db } from "@/lib/firebase-admin";
import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { runSync } from "@/modules/sync-runner";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
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

  const result = await runSync(connection, store);

  if (result.status === "error") {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
