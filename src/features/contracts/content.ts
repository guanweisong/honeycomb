// 唯一公共出口：模型由所属 Feature 定义，这里不重建返回类型。
export type { CategoryViewModel } from "@/features/category/presentation/category-view-model";
export type {
  AdminCommentViewModel,
  PublicCommentViewModel,
  CommentTreeViewModel,
} from "@/features/comment/presentation/comment-view-model";
export type { LinkViewModel } from "@/features/link/presentation/link-view-model";
export type { TagViewModel } from "@/features/tag/presentation/tag-view-model";
export type {
  PostListViewModel,
  PostDetailViewModel,
} from "@/features/post/presentation/post-view-model";
export type { PageViewModel } from "@/features/page/presentation/page-view-model";
export type { MediaViewModel } from "@/features/media/shared/media-view-model";
export type { UserViewModel } from "@/features/user/presentation/user-view-model";
export type { MenuItem as MenuViewModel } from "@/features/menu/application/repository";
export type { SettingViewModel } from "@/features/setting/application/repository";
export {
  MediaRecordSchema,
  type MediaRecord,
} from "@/features/media/application/repository";
export {
  TagRecordSchema,
  type TagRecord,
} from "@/features/tag/application/repository";
