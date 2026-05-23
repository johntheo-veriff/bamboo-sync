import { db } from "@/lib/firebase-admin";
import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LandingContent from "./LandingContent";

export default async function Home() {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;

  if (googleAccountId) {
    const store = createFirebaseConnectionStore(db);
    const connection = await store.get(googleAccountId);
    redirect(connection ? "/management" : "/api/auth/google/reconnect");
  }

  return <LandingContent />;
}
