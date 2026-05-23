import { db } from "@/lib/firebase-admin";
import { createFirebaseGoogleIdentityStore } from "@/modules/google-identity-store/firebase-adapter";
import { UserAvatar } from "@/components/UserAvatar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ConnectForm from "./ConnectForm";

export default async function ConnectPage() {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;
  const hasTokens = !!cookieStore.get("google-tokens")?.value;

  if (!googleAccountId || !hasTokens) {
    redirect("/");
  }

  const identityStore = createFirebaseGoogleIdentityStore(db);
  const identity = await identityStore.get(googleAccountId);
  const email = identity?.email ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <UserAvatar email={email} />
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <ConnectForm />
      </div>
    </div>
  );
}
