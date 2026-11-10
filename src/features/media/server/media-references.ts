import "server-only";
import { and, asc, eq, gt, inArray, notInArray, or, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import type { MediaRecord } from "@/features/media/types/media.record";
import type { I18n } from "@/lib/i18n/i18n";
import {
  getLocalizedImageLinks,
  getAllImageLinkFromHtml,
} from "@/lib/content/image-links";
import { clientEnv } from "@/env/client";
import { ApplicationError } from "@/lib/errors/application-error";
import { assertOrdinaryMediaSchema } from "@/features/media/server/media-schema-readiness";
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function managedMediaKey(value: string): string | null {
  try {
    if (!clientEnv.NEXT_PUBLIC_ASSET_URL) return null;
    const base = new URL(
      `${clientEnv.NEXT_PUBLIC_ASSET_URL.replace(/\/$/, "")}/`,
    );
    // WHATWG parsing handles whitespace and backslash network paths like browsers.
    // A synthetic origin prevents ordinary relative paths being mistaken for asset URLs.
    const url = new URL(value, `${base.protocol}//relative.invalid/`);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
      return null;
    return decodeURIComponent(url.pathname.slice(base.pathname.length)) || null;
  } catch {
    return null;
  }
}

/**
 * 必须与所属正文写入共用事务，避免校验与保存之间穿插删除。
 * 仅检查封面及受管图片 URL；未知历史 URL 可原样保留，但不能新增。
 */
export async function assertMediaReferencesExist(
  tx: Transaction,
  input: {
    coverId?: string | null;
    content?: Partial<I18n> | null;
    previousContent?: Partial<I18n> | null;
  },
) {
  await assertOrdinaryMediaSchema(tx);
  if (input.coverId) {
    const [cover] = await tx
      .select()
      .from(schema.media)
      .where(eq(schema.media.id, input.coverId))
      .limit(1);
    if (!cover)
      throw new ApplicationError("CONFLICT", "封面媒体不可用，请重新选择");
  }
  const keys = [
    ...new Set(
      getLocalizedImageLinks(input.content).flatMap((url) => {
        const key = managedMediaKey(url);
        return key ? [key] : [];
      }),
    ),
  ];
  if (!keys.length) return;
  const previous = new Set(
    getLocalizedImageLinks(input.previousContent).map(managedMediaKey),
  );
  const rows = await tx
    .select()
    .from(schema.media)
    .where(inArray(schema.media.key, keys));
  const existingKeys = new Set(rows.map((row) => row.key));
  for (const key of keys) {
    // Unknown historical URLs may remain unchanged, but cannot be newly introduced.
    if (!existingKeys.has(key) && !previous.has(key))
      throw new ApplicationError(
        "CONFLICT",
        "正文中的受管媒体不可用，请核对后重试",
      );
  }
}

const REFERENCE_SCAN_BATCH_SIZE = 64;

async function scanReferenceBatches<Row extends object>(
  read: (cursor: Row | undefined) => PromiseLike<Row[]>,
  matches: (row: Row) => boolean,
  signal?: AbortSignal,
) {
  let cursor: Row | undefined;
  do {
    signal?.throwIfAborted();
    const rows = await read(cursor);
    signal?.throwIfAborted();
    if (rows.some(matches)) return true;
    if (rows.length < REFERENCE_SCAN_BATCH_SIZE) return false;
    cursor = rows.at(-1);
  } while (cursor);
  return false;
}

/** 只证明已知字段中的引用；无结果不代表历史、外部或未登记用途均不存在。 */
export async function findKnownMediaReferences(
  tx: Transaction,
  targets: readonly Pick<MediaRecord, "id" | "key" | "url">[],
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (!targets.length) return false;
  const ids = targets.map((row) => row.id);
  const keys = new Set(targets.map((row) => row.key));
  const urls = new Set(targets.map((row) => row.url));
  const [cover] = await tx
    .select({ id: schema.post.id })
    .from(schema.post)
    .where(inArray(schema.post.coverId, ids))
    .limit(1);
  signal?.throwIfAborted();
  if (cover) return true;
  const [duplicate] = await tx
    .select({ id: schema.media.id })
    .from(schema.media)
    .where(
      and(
        notInArray(schema.media.id, ids),
        or(
          inArray(schema.media.key, [...keys]),
          inArray(schema.media.url, [...urls]),
        ),
      ),
    )
    .limit(1);
  signal?.throwIfAborted();
  if (duplicate) return true;

  const matchesUrl = (url: string) =>
    urls.has(url) || keys.has(managedMediaKey(url) ?? "");
  for (const { table, id } of [
    { table: schema.postTranslation, id: schema.postTranslation.postId },
    { table: schema.pageTranslation, id: schema.pageTranslation.pageId },
  ]) {
    if (
      await scanReferenceBatches<
        { id: string } & Pick<
          typeof schema.postTranslation.$inferSelect,
          "locale" | "content"
        >
      >(
        (cursor) =>
          tx
            .select({ id, locale: table.locale, content: table.content })
            .from(table)
            .where(
              cursor
                ? sql`(${id}, ${table.locale}) > (${cursor.id}, ${cursor.locale})`
                : undefined,
            )
            .orderBy(asc(id), asc(table.locale))
            .limit(REFERENCE_SCAN_BATCH_SIZE),
        (row) =>
          getAllImageLinkFromHtml(row.content ?? undefined).some(matchesUrl),
        signal,
      )
    )
      return true;
  }
  for (const { table, url } of [
    { table: schema.link, url: schema.link.logo },
    { table: schema.user, url: schema.user.image },
  ]) {
    if (
      await scanReferenceBatches<{ id: string; url: string | null }>(
        (cursor) =>
          tx
            .select({ id: table.id, url })
            .from(table)
            .where(cursor ? gt(table.id, cursor.id) : undefined)
            .orderBy(asc(table.id))
            .limit(REFERENCE_SCAN_BATCH_SIZE),
        (row) => Boolean(row.url && matchesUrl(row.url)),
        signal,
      )
    )
      return true;
  }
  return false;
}
