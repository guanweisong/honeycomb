import "server-only";

import { supportedLanguages } from "@/lib/i18n/i18n";
import { MAX_PAGE_SIZE } from "@/lib/validation/resource-limits";

const EMPTY_DETAIL_ID_PLACEHOLDER = "__no-published-detail__";

export async function getPublishedPostDetailStaticParams() {
  const [{ getDb }, { listPublishedPostSitemapEntries }] = await Promise.all([
    import("@/lib/db/db"),
    import("@/features/post/server/post-queries"),
  ]);
  const db = getDb();

  return getLocalizedDetailStaticParams((page, limit) =>
    listPublishedPostSitemapEntries(db, page, limit),
  );
}

export async function getPublishedPageDetailStaticParams() {
  const [{ getDb }, { listPublishedPageSitemapEntries }] = await Promise.all([
    import("@/lib/db/db"),
    import("@/features/page/server/page-queries"),
  ]);
  const db = getDb();

  return getLocalizedDetailStaticParams((page, limit) =>
    listPublishedPageSitemapEntries(db, page, limit),
  );
}

/**
 * Enumerate published detail IDs for build-time prerendering without loading
 * detail bodies. Cache Components requires at least one generated param, so an
 * invalid placeholder keeps an empty blog buildable and is rejected by the
 * detail route's existing ID validation.
 */
export async function getLocalizedDetailStaticParams(
  listPublishedEntries: (
    page: number,
    limit: number,
  ) => Promise<Array<{ id: string }>>,
) {
  const entries: Array<{ id: string }> = [];

  for (let page = 1; ; page += 1) {
    const batch = await listPublishedEntries(page, MAX_PAGE_SIZE);
    entries.push(...batch);
    if (batch.length < MAX_PAGE_SIZE) break;
  }

  if (entries.length === 0) {
    return supportedLanguages.map((locale) => ({
      locale,
      id: EMPTY_DETAIL_ID_PLACEHOLDER,
    }));
  }

  return supportedLanguages.flatMap((locale) =>
    entries.map(({ id }) => ({ locale, id })),
  );
}
