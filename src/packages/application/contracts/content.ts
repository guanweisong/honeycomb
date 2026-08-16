import type { toPublicComment } from "@/packages/application/comments/comment-dto";
import type {
  getCategoryList,
  getLinkList,
  getTagList,
} from "@/packages/application/content/catalog";
import type {
  getPostDetail,
  getPostList,
} from "@/packages/application/content/post";
import type { getPageList } from "@/packages/application/content/page/page-queries";
import type { getMediaList } from "@/packages/application/media/media-queries";
import type { getMenuList } from "@/packages/application/navigation/menu-queries";
import type { getSetting } from "@/packages/application/settings/setting-queries";
import type { getUserList } from "@/packages/application/identity/user-queries";

/** 公开评论 ViewModel。 */
export type CommentViewModel = ReturnType<typeof toPublicComment>;
/** 分类列表项 ViewModel。 */
export type CategoryViewModel = Awaited<
  ReturnType<typeof getCategoryList>
>["list"][number];
/** 链接列表项 ViewModel。 */
export type LinkViewModel = Awaited<
  ReturnType<typeof getLinkList>
>["list"][number];
/** 标签列表项 ViewModel。 */
export type TagViewModel = Awaited<
  ReturnType<typeof getTagList>
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
  ReturnType<typeof getPageList>
>["list"][number];
/** 媒体列表项 ViewModel。 */
export type MediaViewModel = Awaited<
  ReturnType<typeof getMediaList>
>["list"][number];
/** 菜单列表项 ViewModel。 */
export type MenuViewModel = Awaited<
  ReturnType<typeof getMenuList>
>["list"][number];
/** 网站设置 ViewModel。 */
export type SettingViewModel = Awaited<ReturnType<typeof getSetting>>;
/** 用户列表项 ViewModel。 */
export type UserViewModel = Awaited<
  ReturnType<typeof getUserList>
>["list"][number];
