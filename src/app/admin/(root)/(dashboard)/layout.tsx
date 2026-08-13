import { getAdminUser } from "@/app/admin/lib/admin-auth";
import { createServerClient } from "@/packages/trpc/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClientShell } from "./DashboardClientShell";
import { AdminProviders } from "@/app/admin/AdminProviders";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser(await headers());

  if (!user) {
    redirect("/admin/login");
  }

  const serverClient = await createServerClient();
  const setting = await serverClient.setting.index();

  return (
    <AdminProviders>
      <DashboardClientShell user={user} setting={setting}>
        {children}
      </DashboardClientShell>
    </AdminProviders>
  );
}
