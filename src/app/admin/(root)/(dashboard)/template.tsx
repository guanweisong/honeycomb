import { getCurrentAdminUser } from "@/app/admin/lib/admin-auth";
import {
  ADMIN_PATHNAME_HEADER,
  canAccessAdminRoute,
} from "@/app/admin/constants/route-capabilities";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminRouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const user = await getCurrentAdminUser();
  if (!user) return redirect("/admin/login");

  const pathname = requestHeaders.get(ADMIN_PATHNAME_HEADER);
  if (!pathname || !canAccessAdminRoute(user.level, pathname)) {
    return redirect("/admin/forbidden");
  }

  return children;
}
