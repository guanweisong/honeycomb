import { getAdminUser } from "@/app/admin/lib/admin-auth";
import { getAuthProviders } from "@/app/admin/lib/auth-providers";
import { getSiteSetting } from "@/app/lib/server/site-setting";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LoginClient from "./components/LoginClient";
import { normalizeAdminCallback } from "./safe-admin-callback";
import AdminRouteFallback from "@/app/admin/components/AdminRouteFallback";

export default function LoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  return (
    <Suspense fallback={<AdminRouteFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  searchParams,
}: Pick<PageProps<"/admin/login">, "searchParams">) {
  const requestHeaders = await headers();
  const user = await getAdminUser(requestHeaders);

  if (user) {
    redirect("/admin/dashboard");
  }

  const [setting, providers] = await Promise.all([
    getSiteSetting(requestHeaders),
    getAuthProviders(),
  ]);
  const targetUrl = normalizeAdminCallback((await searchParams).targetUrl);

  return <LoginClient setting={setting} providers={providers} targetUrl={targetUrl} />;
}
import { Suspense } from "react";
