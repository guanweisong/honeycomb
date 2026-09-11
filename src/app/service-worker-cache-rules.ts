type RuntimeRequest = {
  sameOrigin: boolean;
  url: Pick<URL, "pathname">;
};

export function isPrivateRuntimePath(pathname: string): boolean {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

/** Service Worker runtime caches are limited to same-origin public routes. */
export function isPublicRuntimeRequest({
  sameOrigin,
  url,
}: RuntimeRequest): boolean {
  return sameOrigin && !isPrivateRuntimePath(url.pathname);
}
