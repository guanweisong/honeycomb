import { getCurrentAdminUser } from "@/app/admin/lib/admin-auth";
import { redirect } from "next/navigation";
import { DashboardClientShell } from "./components/DashboardClientShell";
import { AdminProviders } from "@/app/admin/AdminProviders";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAdminUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <AdminProviders initialUser={user}>
      <DashboardClientShell user={user}>{children}</DashboardClientShell>
    </AdminProviders>
  );
}
