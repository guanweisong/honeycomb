import { clientEnv } from "@/env/client";
export type {
  NotificationComment as CommentNotification,
  NotificationSetting as CommentNotificationSetting,
} from "@/features/comment/types/comment.notification";
import type { NotificationComment } from "@/features/comment/types/comment.notification";
export const CUSTOM_COMMENT_NOTIFICATION_TITLE = "自定义内容收到评论";

/** 根据已知目标生成邮件链接；自定义目标未定义路由，只提供通用标题。 */
export function getCommentTarget(comment: NotificationComment) {
  if (comment.customId)
    return { postTitle: CUSTOM_COMMENT_NOTIFICATION_TITLE, postLink: null };
  const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL ?? "";
  const baseUrl = `${siteUrl.replace(/\/+$/, "")}/`;
  if (comment.postId)
    return {
      postTitle: comment.post?.title?.zh ?? "",
      postLink: new URL(
        `archives/${encodeURIComponent(comment.postId)}`,
        baseUrl,
      ).toString(),
    };
  if (comment.pageId)
    return {
      postTitle: comment.page?.title?.zh ?? "",
      postLink: new URL(
        `pages/${encodeURIComponent(comment.pageId)}`,
        baseUrl,
      ).toString(),
    };
  return { postTitle: "", postLink: null };
}
