import { fetchCurrentEmployee, fetchWhosOut } from "@/modules/bamboo-hr-client";
import { BambooAuthError } from "@/modules/bamboo-hr-client/types";
import { db } from "@/lib/firebase-admin";
import { createFirebaseGoogleIdentityStore } from "@/modules/google-identity-store/firebase-adapter";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;
  const hasTokens = !!cookieStore.get("google-tokens")?.value;

  if (!googleAccountId || !hasTokens) {
    return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });
  }

  const subdomain = process.env.BAMBOOHR_SUBDOMAIN;
  const apiKey = process.env.BAMBOOHR_API_KEY;
  if (!subdomain || !apiKey) {
    return NextResponse.json({ error: "BambooHR not configured" }, { status: 500 });
  }

  try {
    const identityStore = createFirebaseGoogleIdentityStore(db);
    const identity = await identityStore.get(googleAccountId);
    const userEmail = identity?.email ?? "";

    const bambooConfig = { subdomain, apiKey };
    const [entries, employee] = await Promise.all([
      fetchWhosOut(bambooConfig),
      userEmail ? fetchCurrentEmployee(bambooConfig, userEmail) : Promise.resolve(null),
    ]);

    const holidays = entries.filter((e) => e.type === "holiday");
    const allTimeOff = entries.filter((e) => e.type === "time-off");
    const timeOffEntries = employee
      ? allTimeOff.filter((e) => e.name === employee.displayName)
      : allTimeOff;

    const holidayList = holidays.map((h) => ({ name: h.name, startDate: h.startDate }));

    return NextResponse.json({
      timeOffEntries,
      holidays: holidayList,
      holidayCount: holidays.length,
    });
  } catch (err) {
    if (err instanceof BambooAuthError) {
      return NextResponse.json({ error: "BambooHR authentication failed" }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not reach BambooHR" }, { status: 502 });
  }
}
