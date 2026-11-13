import "server-only";

import { supportedLanguages } from "@/lib/i18n/i18n";

/** Generate only public filter routes that currently have published posts. */
export async function getPublishedPostListStaticParams() {
  const [{ getDb }, { listPublishedPostListFilterIds }] = await Promise.all([
    import("@/lib/db/db"),
    import("@/features/post/server/post-queries"),
  ]);
  const { authorIds, tagIds } = await listPublishedPostListFilterIds(getDb());

  return supportedLanguages.flatMap((locale) => [
    ...tagIds.map((id) => ({ locale, slug: ["tags", id] })),
    ...authorIds.map((id) => ({ locale, slug: ["authors", id] })),
  ]);
}
