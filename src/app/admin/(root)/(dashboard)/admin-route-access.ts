export function getAdminRouteAccessDecision(
  isAuthenticated: boolean,
  hasRouteCapability: boolean,
): "login" | "forbidden" | "allow" {
  if (!isAuthenticated) return "login";
  if (!hasRouteCapability) return "forbidden";
  return "allow";
}
