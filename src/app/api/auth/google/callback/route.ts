import { db } from "@/lib/firebase-admin";
import { exchangeGoogleCode, getGoogleUserInfo } from "@/lib/google-oauth";
import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { runSync } from "@/modules/sync-runner";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=google_cancelled", request.url));
  }

  const cookieStore = await cookies();
  const bambooRaw = cookieStore.get("bamboo-credentials")?.value;

  if (!bambooRaw) {
    return NextResponse.redirect(new URL("/?error=session_expired", request.url));
  }

  let bambooCredentials: { subdomain: string; apiKey: string };
  try {
    bambooCredentials = JSON.parse(bambooRaw);
  } catch {
    return NextResponse.redirect(new URL("/?error=session_expired", request.url));
  }

  try {
    const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
    const { accessToken, refreshToken } = await exchangeGoogleCode(code, redirectUri);
    const { sub: googleAccountId } = await getGoogleUserInfo(accessToken);

    const store = createFirebaseConnectionStore(db);
    const connection = {
      googleAccountId,
      bambooSubdomain: bambooCredentials.subdomain,
      bambooApiKey: bambooCredentials.apiKey,
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken,
      lastSyncStatus: "pending" as const,
      lastSyncError: null,
      nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    await store.save(connection);

    // Trigger initial sync in the background — don't await it
    runSync(connection, store).catch(console.error);

    // Clear bamboo credentials, set account cookie for Management Page
    cookieStore.delete("bamboo-credentials");
    cookieStore.set("google-account-id", googleAccountId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=connection_failed", request.url));
  }

  return NextResponse.redirect(new URL("/management", request.url));
}
