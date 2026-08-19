import { clientEnv } from "@/env/client";
export type { NotificationComment as CommentNotification, NotificationSetting as CommentNotificationSetting } from "../../infrastructure/comment-notification-repository";
import type { NotificationComment } from "../../infrastructure/comment-notification-repository";
/** 根据评论关联内容生成邮件展示目标。 */
export function getCommentTarget(comment: NotificationComment) {
  const frontDomain = new URL(clientEnv.NEXT_PUBLIC_SITE_URL ?? "").host;
  if (comment.postId) return { postTitle: comment.post?.title?.zh ?? "", postLink: `https://${frontDomain}/archives/${comment.postId}` };
  if (comment.pageId) return { postTitle: comment.page?.title?.zh ?? "", postLink: `https://${frontDomain}/pages/${comment.pageId}` };
  return { postTitle: "", postLink: "" };
}
