import "server-only";
import { createServerClient } from "@/app/trpc/server";
import { BLOG_LIST_CACHE_TAG } from "@/lib/cache/public-cache-keys";
import { cacheLife, cacheTag } from "next/cache";

/** Settings used in public metadata change with the cached blog layout. */
export async function getCachedMetadataSettings() {
  "use cache";

  cacheLife("hours");
  cacheTag(BLOG_LIST_CACHE_TAG);

  const trpc = await createServerClient({
    requestContext: { requestId: "public-metadata-cache-fill" },
    skipRequestObservability: true,
  });
  return trpc.setting.index();
}
