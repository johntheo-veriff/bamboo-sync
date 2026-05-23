import { getStores } from "@/lib/stores";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LandingContent from "./LandingContent";

export default async function Home() {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (googleAccountId) {
    const { connectionStore } = getStores();
    const connection = await connectionStore.get(googleAccountId);
    redirect(connection ? "/management" : "/api/auth/google/reconnect");
  }

  return <LandingContent />;
}
