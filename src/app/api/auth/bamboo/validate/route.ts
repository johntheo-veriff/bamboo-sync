import { fetchWhosOut } from "@/modules/bamboo-hr-client";
import { BambooAuthError } from "@/modules/bamboo-hr-client/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  return NextResponse.json({ valid: true });
}
