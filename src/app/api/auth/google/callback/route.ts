import { getStores } from "@/lib/stores";
import { exchangeGoogleCode, getGoogleUserInfo, GoogleOAuthError, GoogleOAuthNetworkError } from "@/lib/google-oauth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/?error=google_cancelled`);
  }

  try {
    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const { accessToken, refreshToken } = await exchangeGoogleCode(code, redirectUri);
    const { sub: googleAccountId, email } = await getGoogleUserInfo(accessToken);

    if (!email.endsWith("@veriff.net")) {
      return NextResponse.redirect(`${appUrl}/?error=unauthorized_domain`);
    }

    const cookieStore = await cookies();

    cookieStore.set("google-account-id", googleAccountId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year — persists across browser sessions
      path: "/",
    });

    const { connectionStore, identityStore } = getStores();

    // Persist Google Identity independently of the Connection so it survives disconnect/logout
    await identityStore.save({ googleAccountId, refreshToken, email });

    // Check if this account already has a connection
    const existing = await connectionStore.get(googleAccountId);

    if (existing) {
      return NextResponse.redirect(`${appUrl}/management`);
    }

    // Store tokens temporarily so /connect can save them with the BambooHR credentials
    cookieStore.set("google-tokens", JSON.stringify({ accessToken, refreshToken }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes — enough time to fill the BambooHR form
      path: "/",
    });

    return NextResponse.redirect(`${appUrl}/connect`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    if (err instanceof GoogleOAuthNetworkError) {
      return NextResponse.redirect(`${appUrl}/?error=google_network_error`);
    }
    if (err instanceof GoogleOAuthError) {
      return NextResponse.redirect(`${appUrl}/?error=google_oauth_failed`);
    }
    return NextResponse.redirect(`${appUrl}/?error=connection_failed`);
  }
}
