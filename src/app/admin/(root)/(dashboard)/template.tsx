import { Suspense } from "react";
import { getCurrentAdminUser } from "@/app/admin/lib/admin-auth";
import {
  ADMIN_PATHNAME_HEADER,
  canAccessAdminRoute,
} from "@/app/admin/constants/route-capabilities";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LoadingState from "@/packages/ui/extended/LoadingState";
import { getAdminRouteAccessDecision } from "./admin-route-access";

export default function AdminRouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingState variant="region" />}>
      <AdminRouteAccess>{children}</AdminRouteAccess>
    </Suspense>
  );
}

async function AdminRouteAccess({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const user = await getCurrentAdminUser();
  const pathname = requestHeaders.get(ADMIN_PATHNAME_HEADER);
  const hasRouteCapability =
    user !== null &&
    pathname !== null &&
    canAccessAdminRoute(user.level, pathname);
  const decision = getAdminRouteAccessDecision(
    user !== null,
    hasRouteCapability,
  );
  if (decision === "login") return redirect("/admin/login");
  if (decision === "forbidden") {
    return redirect("/admin/forbidden");
  }

  return children;
}
