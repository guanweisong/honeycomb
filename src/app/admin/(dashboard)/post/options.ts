import { PostStatusName } from "@/features/post/types/post.status-name";
import { PostTypeName } from "@/features/post/types/post.type-name";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";

/** 用于在 UI 中显示文章状态的选项数组。 */
export const postStatusOptions = [
  {
    label: PostStatusName.PUBLISHED,
    value: PostStatus.PUBLISHED,
  },
  {
    label: PostStatusName.DRAFT,
    value: PostStatus.DRAFT,
  },
  {
    label: PostStatusName.TO_AUDIT,
    value: PostStatus.TO_AUDIT,
  },
];

/** 用于在 UI 中显示文章类型的选项数组。 */
export const postTypeOptions = [
  {
    label: PostTypeName.ARTICLE,
    value: PostType.ARTICLE,
  },
  {
    label: PostTypeName.MOVIE,
    value: PostType.MOVIE,
  },
  {
    label: PostTypeName.PHOTOGRAPH,
    value: PostType.PHOTOGRAPH,
  },
  {
    label: PostTypeName.QUOTE,
    value: PostType.QUOTE,
  },
];
