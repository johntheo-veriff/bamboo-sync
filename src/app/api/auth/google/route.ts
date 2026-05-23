import { getGoogleAuthUrl } from "@/lib/google-oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const authUrl = getGoogleAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
