import {
  readStoredJson,
  writeVerifiedJson,
} from "@/app/admin/(dashboard)/draft/verified-storage";
import { z } from "zod";
import { PageFieldsSchema } from "@/features/page/schemas/page.fields.schema";
import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
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
  const result = PageInsertSchema.safeParse(readStoredJson(attemptKey(userId)));
  return result.success ? result.data : null;
}
/** 发送前按账户同步保存并回读创建意图；结果未知时必须复用原令牌与内容核对。 */
export function writePageCreationAttempt(
  userId: string,
  input: PageInsert,
): boolean {
  try {
    return writeVerifiedJson(attemptKey(userId), PageInsertSchema.parse(input));
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
  const key = `honeycomb:draft:page:${encodeURIComponent(userId)}:${id}`;
  return writeVerifiedJson(key, { version: 1, savedAt: Date.now(), values });
}
