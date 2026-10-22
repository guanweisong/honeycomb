import { z } from "zod";
import { PostFieldsSchema } from "@/features/post/schema/post.fields.schema";
import { PostInsertSchema } from "@/features/post/schema/post.insert.schema";
import type { PostInsert } from "@/features/post/types/post.insert";
import { TagRecordSchema } from "@/features/tag/schema/tag.record.schema";

const tagOptions = z.array(TagRecordSchema.pick({ id: true, name: true }));
export const PostEditorSchema = PostFieldsSchema.partial().extend({
  id: z.string().optional(),
  galleryStyles: tagOptions.optional(),
  movieActors: tagOptions.optional(),
  movieDirectors: tagOptions.optional(),
  movieStyles: tagOptions.optional(),
});
export type PostEditorValues = z.infer<typeof PostEditorSchema>;
// 草稿只保存不完整编辑输入，不能恢复记录身份或授予发布权限。
const PostDraftSchema = PostEditorSchema.omit({
  id: true,
  status: true,
}).extend({
  categoryId: z.string().optional(),
  baseVersion: z.number().int().nonnegative().optional(),
});
export type PostDraft = z.infer<typeof PostDraftSchema>;
export function parsePostDraft(value: unknown): PostDraft | null {
  const result = PostDraftSchema.safeParse(value);
  return result.success ? result.data : null;
}

const attemptKey = (userId: string) =>
  `honeycomb:draft:post:${encodeURIComponent(userId)}:creation-attempt`;
/** 按账户保存不可变创建意图；发送前同步写入并回读确认，不能依赖草稿防抖落盘。 */
export function writePostCreationAttempt(
  userId: string,
  input: PostInsert,
): boolean {
  try {
    const json = JSON.stringify(PostInsertSchema.parse(input));
    window.localStorage.setItem(attemptKey(userId), json);
    return window.localStorage.getItem(attemptKey(userId)) === json;
  } catch {
    return false;
  }
}
export function readPostCreationAttempt(userId: string): PostInsert | null {
  try {
    const raw = window.localStorage.getItem(attemptKey(userId));
    if (!raw) return null;
    const result = PostInsertSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export function clearPostCreationAttempt(
  userId: string,
  creationToken: string,
) {
  try {
    if (readPostCreationAttempt(userId)?.creationToken === creationToken)
      window.localStorage.removeItem(attemptKey(userId));
  } catch {
    /* Keep editing available when storage is unavailable. */
  }
}

/** Preserve the displaced edit when the user explicitly loads a conflicting server version. */
export function preservePostDraft(
  userId: string,
  postId: string,
  values: PostDraft,
): boolean {
  try {
    const raw = JSON.stringify({ version: 1, savedAt: Date.now(), values });
    const key = `honeycomb:draft:post:${encodeURIComponent(userId)}:${postId}`;
    window.localStorage.setItem(key, raw);
    return window.localStorage.getItem(key) === raw;
  } catch {
    return false;
  }
}
