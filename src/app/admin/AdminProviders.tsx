"use client";

import { trpc, trpcClient } from "@/lib/trpc/client/trpc";
import { createAdminQueryClient } from "@/lib/trpc/client/admin-query-client";
import { CurrentUserProvider } from "@/features/user/admin/use-current-user";
import { SiteSettingProvider } from "@/features/setting/admin/use-site-setting";
import type { AdminUser } from "./lib/admin-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React from "react";

export function AdminProviders({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AdminUser;
}) {
  const router = useRouter();
  const [queryClient] = React.useState(() =>
    createAdminQueryClient({
      onForbidden: () => router.replace("/admin/forbidden"),
    }),
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <CurrentUserProvider initialUser={initialUser}>
          <SiteSettingProvider>{children}</SiteSettingProvider>
        </CurrentUserProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
