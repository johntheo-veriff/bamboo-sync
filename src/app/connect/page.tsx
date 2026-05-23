import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ConnectForm from "./ConnectForm";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ subdomain?: string }>;
}) {
  const cookieStore = await cookies();
  const googleAccountId = cookieStore.get("google-account-id")?.value;
  const hasTokens = !!cookieStore.get("google-tokens")?.value;

  if (!googleAccountId || !hasTokens) {
    redirect("/");
  }

  const { subdomain } = await searchParams;

  return <ConnectForm defaultSubdomain={subdomain ?? ""} />;
}
