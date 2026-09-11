type CacheStorageBoundary = Pick<CacheStorage, "delete" | "keys">;
type LocationBoundary = Pick<Location, "replace">;

const isPrecache = (cacheName: string) =>
  cacheName.toLowerCase().includes("precache");

/**
 * 删除所有非 precache 的同源 Cache Storage 条目，包括旧 Serwist runtime
 * cache；保留 precache 以支持登录页所需的离线静态资源。
 */
export async function clearHoneycombRuntimeCaches(
  cacheStorage: CacheStorageBoundary,
): Promise<void> {
  const cacheNames = await cacheStorage.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => !isPrecache(cacheName))
      .map((cacheName) => cacheStorage.delete(cacheName)),
  );
}

export function navigateToAdminLogin(location: LocationBoundary): void {
  location.replace("/admin/login");
}
