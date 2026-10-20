import "server-only";
import { eq, inArray, or } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import type { I18n } from "@/lib/i18n/i18n";
import {
  getLocalizedImageLinks,
  getAllImageLinkFromHtml,
} from "@/lib/content/image-links";
import { clientEnv } from "@/env/client";
import { ApplicationError } from "@/lib/errors/application-error";
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
export async function assertMediaReferencesReady(
  tx: Transaction,
  input: {
    coverId?: string | null;
    content?: Partial<I18n> | null;
    previousContent?: Partial<I18n> | null;
  },
) {
  if (input.coverId) {
    const [cover] = await tx
      .select()
      .from(schema.media)
      .where(eq(schema.media.id, input.coverId))
      .limit(1);
    if (!cover || cover.state !== "READY")
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
  for (const key of keys) {
    const matching = rows.filter((row) => row.key === key);
    // Unknown historical URLs may remain unchanged, but cannot be newly introduced.
    if (
      (!matching.length && !previous.has(key)) ||
      matching.some((row) => row.state !== "READY")
    )
      throw new ApplicationError(
        "CONFLICT",
        "正文中的受管媒体不可用，请核对后重试",
      );
  }
}

/** 只证明已知字段中的引用；无结果不代表历史、外部或未登记用途均不存在。 */
export async function findKnownMediaReferences(
  tx: Transaction,
  targets: readonly { id: string; key: string; url: string }[],
) {
  if (!targets.length) return false;
  const ids = targets.map((row) => row.id);
  const keys = new Set(targets.map((row) => row.key));
  const urls = new Set(targets.map((row) => row.url));
  const [cover] = await tx
    .select({ id: schema.post.id })
    .from(schema.post)
    .where(inArray(schema.post.coverId, ids))
    .limit(1);
  if (cover) return true;
  const duplicate = await tx
    .select({ id: schema.media.id, state: schema.media.state })
    .from(schema.media)
    .where(
      or(
        inArray(schema.media.key, [...keys]),
        inArray(schema.media.url, [...urls]),
      ),
    );
  if (duplicate.some((row) => row.state !== "DELETED" && !ids.includes(row.id)))
    return true;
  const contents = [
    ...(await tx
      .select({ content: schema.postTranslation.content })
      .from(schema.postTranslation)),
    ...(await tx
      .select({ content: schema.pageTranslation.content })
      .from(schema.pageTranslation)),
  ];
  const matches = (url: string) =>
    urls.has(url) || keys.has(managedMediaKey(url) ?? "");
  if (
    contents.some((row) =>
      getAllImageLinkFromHtml(row.content ?? undefined).some(matches),
    )
  )
    return true;
  const logos = await tx.select({ url: schema.link.logo }).from(schema.link);
  const avatars = await tx.select({ url: schema.user.image }).from(schema.user);
  return [...logos, ...avatars].some((row) => row.url && matches(row.url));
}
