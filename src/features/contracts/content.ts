// 唯一公共出口：模型由所属 Feature 定义，这里不重建返回类型。
export type { CategoryListItem as CategoryViewModel } from "@/features/category/application/repository";
export type {
  AdminCommentViewModel,
  PublicCommentViewModel,
  CommentTreeViewModel,
} from "@/features/comment/presentation/comment-view-model";
export type { LinkRecord as LinkViewModel } from "@/features/link/application/repository";
export type { TagRecord as TagViewModel } from "@/features/tag/application/repository";
export type {
  PostWithRelations as PostListViewModel,
  PostDetailResult as PostDetailViewModel,
} from "@/features/post/application/repository";
export type { PageWithRelations as PageViewModel } from "@/features/page/application/repository";
export type { MediaViewModel } from "@/features/media/shared/media-view-model";
export type {
  CurrentUserRecord,
  UserRecord as UserViewModel,
} from "@/features/user/application/repository";
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
