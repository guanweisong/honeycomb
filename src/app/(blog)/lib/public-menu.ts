import "server-only";
import { createServerClient } from "@/app/trpc/server";
import { BLOG_LIST_CACHE_TAG } from "@/lib/cache/public-cache-keys";
import { cacheLife, cacheTag } from "next/cache";

/** Public navigation changes with the cached blog layout. */
export async function getCachedPublicMenu() {
  "use cache";

  cacheLife("hours");
  cacheTag(BLOG_LIST_CACHE_TAG);

  const trpc = await createServerClient({
    requestContext: { requestId: "public-menu-cache-fill" },
    skipRequestObservability: true,
  });
  return trpc.menu.index();
}
