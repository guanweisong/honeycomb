import type { toPublicComment } from "@/features/comment/application/comment-use-cases";
import type { CategoryRepository } from "@/features/category/application/repository";
import type { LinkRepository } from "@/features/link/application/repository";
import type { TagRepository } from "@/features/tag/application/repository";
import type { PageQueryRepository } from "@/features/page/application/repository";
import type { MediaRepository } from "@/features/media/application/repository";
import type { MenuRepository } from "@/features/menu/application/repository";
import type { SettingRepository } from "@/features/setting/application/repository";
import type {
  getPostDetail,
  getPostList,
} from "@/features/post/application/post-use-cases";
import type { getUserList } from "@/features/user/application/user-use-cases";

/** 公开评论 ViewModel。 */
export type CommentViewModel = ReturnType<typeof toPublicComment>;
/** 分类列表项 ViewModel。 */
export type CategoryViewModel = Awaited<
  ReturnType<CategoryRepository["list"]>
>["list"][number];
/** 链接列表项 ViewModel。 */
export type LinkViewModel = Awaited<
  ReturnType<LinkRepository["list"]>
>["list"][number];
/** 标签列表项 ViewModel。 */
export type TagViewModel = Awaited<
  ReturnType<TagRepository["list"]>
>["list"][number];
/** 文章列表项 ViewModel。 */
export type PostListViewModel = Awaited<
  ReturnType<typeof getPostList>
>["list"][number];
/** 文章详情 ViewModel。 */
export type PostDetailViewModel = NonNullable<
  Awaited<ReturnType<typeof getPostDetail>>
>;
/** 页面列表项 ViewModel。 */
export type PageViewModel = Awaited<
  ReturnType<PageQueryRepository["list"]>
>["list"][number];
/** 媒体列表项 ViewModel。 */
export type MediaViewModel = Awaited<
  ReturnType<MediaRepository["list"]>
>["list"][number];
/** 菜单列表项 ViewModel。 */
export type MenuViewModel = Awaited<
  ReturnType<MenuRepository["list"]>
>["list"][number];
/** 网站设置 ViewModel。 */
export type SettingViewModel = Awaited<ReturnType<SettingRepository["get"]>>;
/** 用户列表项 ViewModel。 */
export type UserViewModel = Awaited<
  ReturnType<typeof getUserList>
>["list"][number];
