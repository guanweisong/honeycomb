import { z } from "zod";
import { PageFieldsSchema } from "@/features/page/schema/page.fields.schema";
import { PageInsertSchema } from "@/features/page/schema/page.insert.schema";
import type { PageInsert } from "@/features/page/types/page.insert";

const localizedDraft = z.object({
  zh: z.string().optional(),
  en: z.string().optional(),
});
export const PageEditorSchema = PageFieldsSchema;
export type PageEditorValues = z.infer<typeof PageEditorSchema>;
// 草稿不携带发布状态；baseVersion 只供恢复时比对，不能绕过服务端版本校验。
const PageDraftSchema = PageFieldsSchema.omit({ status: true })
  .strip()
  .partial()
  .extend({
    baseVersion: z.number().int().nonnegative().optional(),
    title: localizedDraft.optional(),
    content: localizedDraft.optional(),
  });
export type PageDraft = z.infer<typeof PageDraftSchema>;
export function parsePageDraft(value: unknown): PageDraft | null {
  const result = PageDraftSchema.safeParse(value);
  return result.success ? result.data : null;
}

const attemptKey = (userId: string) =>
  `honeycomb:draft:page:${encodeURIComponent(userId)}:creation-attempt`;
export function readPageCreationAttempt(userId: string): PageInsert | null {
  try {
    const raw = window.localStorage.getItem(attemptKey(userId));
    const result = PageInsertSchema.safeParse(raw ? JSON.parse(raw) : null);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
/** 发送前按账户同步保存并回读创建意图；结果未知时必须复用原令牌与内容核对。 */
export function writePageCreationAttempt(
  userId: string,
  input: PageInsert,
): boolean {
  try {
    const raw = JSON.stringify(PageInsertSchema.parse(input));
    window.localStorage.setItem(attemptKey(userId), raw);
    return window.localStorage.getItem(attemptKey(userId)) === raw;
  } catch {
    return false;
  }
}
export function clearPageCreationAttempt(userId: string, token: string) {
  try {
    if (readPageCreationAttempt(userId)?.creationToken === token)
      window.localStorage.removeItem(attemptKey(userId));
    return window.localStorage.getItem(attemptKey(userId)) === null;
  } catch {
    return false;
    /* Retain the form when browser storage is unavailable. */
  }
}
/** 用户加载冲突版本前保留被替换的本地输入；写入失败时由调用方阻止丢弃编辑。 */
export function preservePageDraft(
  userId: string,
  id: string,
  values: PageDraft,
): boolean {
  try {
    const key = `honeycomb:draft:page:${encodeURIComponent(userId)}:${id}`;
    const raw = JSON.stringify({ version: 1, savedAt: Date.now(), values });
    window.localStorage.setItem(key, raw);
    return window.localStorage.getItem(key) === raw;
  } catch {
    return false;
  }
}
