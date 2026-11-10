import { createCreationReceiptStore } from "@/app/admin/(dashboard)/draft/creation-receipts";
import { writeVerifiedJson } from "@/app/admin/(dashboard)/draft/verified-storage";
import { z } from "zod";
import { PostFieldsSchema } from "@/features/post/schemas/post.fields.schema";
import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";
import type { PostInsert } from "@/features/post/types/post.insert";
import { TagRecordSchema } from "@/features/tag/schemas/tag.record.schema";

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

const creationReceipts = createCreationReceiptStore("post", PostInsertSchema);
export const writePostCreationAttempt = creationReceipts.write;
export const readPostCreationAttempt = creationReceipts.read;
export function clearPostCreationAttempt(
  userId: string,
  creationToken: PostInsert["creationToken"],
) {
  creationReceipts.clear(userId, creationToken);
}

/** Preserve the displaced edit when the user explicitly loads a conflicting server version. */
export function preservePostDraft(
  userId: string,
  postId: string,
  values: PostDraft,
): boolean {
  const key = `honeycomb:draft:post:${encodeURIComponent(userId)}:${postId}`;
  return writeVerifiedJson(key, { version: 1, savedAt: Date.now(), values });
}
