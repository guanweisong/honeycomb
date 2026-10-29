import { Suspense } from "react";
import { getCurrentAdminUser } from "@/app/admin/lib/admin-auth";
import { redirect } from "next/navigation";
import { AdminClientShell } from "./components/AdminClientShell";
import { AdminProviders } from "@/app/admin/AdminProviders";
import LoadingState from "@/components/LoadingState";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}

async function AuthenticatedDashboard({
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
      <AdminClientShell user={user}>{children}</AdminClientShell>
    </AdminProviders>
  );
}
