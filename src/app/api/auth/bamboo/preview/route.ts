import { fetchWhosOut } from "@/modules/bamboo-hr-client";
import { BambooAuthError } from "@/modules/bamboo-hr-client/types";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;
  const hasTokens = !!cookieStore.get("google-tokens")?.value;

  if (!googleAccountId || !hasTokens) {
    return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });
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
    const entries = await fetchWhosOut({ subdomain, apiKey });

    const timeOffEntries = entries.filter((e) => e.type === "time-off");
    const holidays = entries.filter((e) => e.type === "holiday");
    const nextHoliday = holidays.length > 0
      ? { name: holidays[0].name, startDate: holidays[0].startDate }
      : null;

    return NextResponse.json({ timeOffEntries, holidayCount: holidays.length, nextHoliday });
  } catch (err) {
    if (err instanceof BambooAuthError) {
      return NextResponse.json({ error: "Invalid BambooHR API key or subdomain" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not reach BambooHR" }, { status: 502 });
  }
}
