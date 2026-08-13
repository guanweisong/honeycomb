import { getAdminUser } from "@/app/admin/lib/admin-auth";
import { getSiteSetting } from "@/app/lib/server/site-setting";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClientShell } from "./DashboardClientShell";
import { AdminProviders } from "@/app/admin/AdminProviders";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const user = await getAdminUser(requestHeaders);

  if (!user) {
    redirect("/admin/login");
  }

  const setting = await getSiteSetting(requestHeaders);

  return (
      <AdminProviders initialUser={user} setting={setting}>
      <DashboardClientShell user={user}>
        {children}
      </DashboardClientShell>
    </AdminProviders>
  );
}
