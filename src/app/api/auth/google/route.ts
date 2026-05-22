import { getGoogleAuthUrl } from "@/lib/google-oauth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const bambooCredentials = cookieStore.get("bamboo-credentials");

  if (!bambooCredentials) {
    return NextResponse.redirect(new URL("/?error=session_expired", request.url));
  }

  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
  const authUrl = getGoogleAuthUrl(redirectUri);

  return NextResponse.redirect(authUrl);
}
