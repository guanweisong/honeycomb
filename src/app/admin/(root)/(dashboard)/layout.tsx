import { getAdminUser } from "@/app/admin/lib/admin-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClientShell } from "./components/DashboardClientShell";
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

  return (
      <AdminProviders initialUser={user}>
      <DashboardClientShell user={user}>
        {children}
      </DashboardClientShell>
    </AdminProviders>
  );
}
