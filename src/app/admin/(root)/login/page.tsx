import { getAdminUser } from "@/app/admin/lib/admin-auth";
import { getAuthProviders } from "@/app/admin/lib/auth-providers";
import { createServerClient } from "@/packages/trpc/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

type LoginPageProps = {
  searchParams: Promise<{ targetUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAdminUser(await headers());

  if (user) {
    redirect("/admin/dashboard");
  }

  const serverClient = await createServerClient();
  const [setting, providers] = await Promise.all([
    serverClient.setting.index(),
    getAuthProviders(),
  ]);
  const targetUrl = (await searchParams).targetUrl;

  return <LoginClient setting={setting} providers={providers} targetUrl={targetUrl} />;
}
