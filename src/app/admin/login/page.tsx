import { getAdminUser } from "@/app/admin/lib/admin-auth";
import { getAuthProviders } from "@/app/admin/lib/auth-providers";
import { getPublicSetting } from "@/app/lib/server/public-queries";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LoginClient from "@/app/admin/login/components/LoginClient";
import { normalizeAdminCallback } from "@/features/user/login/safe-admin-callback";
import LoadingState from "@/components/LoadingState";

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
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
    getPublicSetting(),
    getAuthProviders(),
  ]);
  const targetUrl = normalizeAdminCallback((await searchParams).targetUrl);

  return (
    <LoginClient
      setting={setting}
      providers={providers}
      targetUrl={targetUrl}
    />
  );
}
import { Suspense } from "react";
