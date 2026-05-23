import { db } from "@/lib/firebase-admin";
import { refreshGoogleToken } from "@/lib/google-oauth";
import { createFirebaseGoogleIdentityStore } from "@/modules/google-identity-store/firebase-adapter";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (!googleAccountId) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  const store = createFirebaseGoogleIdentityStore(db);
  const identity = await store.get(googleAccountId);

  if (!identity) {
    cookieStore.delete("google-account-id");
    return NextResponse.redirect(`${appUrl}/`);
  }

  try {
    const { accessToken, refreshToken } = await refreshGoogleToken(identity.refreshToken);

    if (refreshToken !== identity.refreshToken) {
      await store.save({ ...identity, refreshToken });
    }

    cookieStore.set("google-tokens", JSON.stringify({ accessToken, refreshToken }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });

    return NextResponse.redirect(`${appUrl}/connect`);
  } catch {
    cookieStore.delete("google-account-id");
    return NextResponse.redirect(`${appUrl}/`);
  }
}
