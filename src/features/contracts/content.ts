import type { toPublicComment } from "@/features/comment/comment.service";
import type {
  getLinkList,
} from "@/features/link/service";
import type { getCategoryList } from "@/features/category/service";
import type { getTagList } from "@/features/tag/service";
import type {
  getPostDetail,
  getPostList,
} from "@/features/post/post.service";
import type { getPageList } from "@/features/page/service";
import type { getMediaList } from "@/features/media/service";
import type { getMenuList } from "@/features/menu/service";
import type { getSetting } from "@/features/setting/service";
import type { getUserList } from "@/features/user/user.service";

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
