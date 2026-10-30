import type { PostEditorValues } from "@/app/admin/(dashboard)/post/edit/components/utils/post-draft";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";

export type PostFormValues = PostEditorValues;

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
