import { getAdminUser } from "@/app/admin/lib/admin-auth";
import { getAuthProviders } from "@/app/admin/lib/auth-providers";
import { getSiteSetting } from "@/app/lib/server/site-setting";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LoginClient from "./components/LoginClient";

type LoginPageProps = {
  searchParams: Promise<{ targetUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const requestHeaders = await headers();
  const user = await getAdminUser(requestHeaders);

  if (user) {
    redirect("/admin/dashboard");
  }

  const [setting, providers] = await Promise.all([
    getSiteSetting(requestHeaders),
    getAuthProviders(),
  ]);
  const targetUrl = (await searchParams).targetUrl;

  return <LoginClient setting={setting} providers={providers} targetUrl={targetUrl} />;
}
