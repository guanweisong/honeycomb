import type { PostInsert } from "@/features/post/schemas/post.insert.schema";
import type { PostUpdate } from "@/features/post/schemas/post.update.schema";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";

export type PostFormValues = Partial<PostInsert> | PostUpdate;

type NormalizePostFormResult<T extends PostFormValues> =
  | { ok: true; data: Omit<T, "status"> & { status: PostStatus } }
  | { ok: false; reason: "COVER_REQUIRED" };

export function normalizePostForm<T extends PostFormValues>(
  values: T,
  status: PostStatus,
): NormalizePostFormResult<T> {
  const { status: previousStatus, ...fields } = values;
  void previousStatus;
  const data = { ...fields, status };
  const type = data.type ?? PostType.ARTICLE;

  if (
    [PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH].includes(type) &&
    !data.coverId
  ) {
    return { ok: false, reason: "COVER_REQUIRED" };
  }

  return { ok: true, data };
}
