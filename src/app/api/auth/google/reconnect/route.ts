import { getStores } from "@/lib/stores";
import { refreshGoogleToken } from "@/lib/google-oauth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (!googleAccountId) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  const { identityStore } = getStores();
  const identity = await identityStore.get(googleAccountId);

  if (!identity) {
    cookieStore.delete("google-account-id");
    return NextResponse.redirect(`${appUrl}/`);
  }

  try {
    const { accessToken, refreshToken } = await refreshGoogleToken(identity.refreshToken);

    if (refreshToken !== identity.refreshToken) {
      await identityStore.save({ ...identity, refreshToken });
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
