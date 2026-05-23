import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const cookieStore = await cookies();
  cookieStore.delete("google-account-id");
  return NextResponse.redirect(`${appUrl}/`);
}
