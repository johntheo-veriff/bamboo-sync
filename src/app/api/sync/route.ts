import { getStores } from "@/lib/stores";
import { runSync } from "@/modules/sync-runner";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => ({})) as { userTimezone?: string };
  const browserTimezone = body.userTimezone || undefined;
  if (browserTimezone && browserTimezone !== connection.userTimezone) {
    await connectionStore.updateTimezone(googleAccountId, browserTimezone);
    connection.userTimezone = browserTimezone;
  }

  const result = await runSync(connection, connectionStore);

  if (result.status === "error") {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
