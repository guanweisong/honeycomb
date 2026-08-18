import type { InferSelectModel } from "drizzle-orm";
import { clientEnv } from "@/env/client";
import * as schema from "@/packages/infrastructure/db/schema";

type PostReference = Pick<InferSelectModel<typeof schema.post>, "id" | "title">;
type PageReference = Pick<InferSelectModel<typeof schema.page>, "id" | "title">;
export type CommentNotification = Pick<
  InferSelectModel<typeof schema.comment>,
  "id" | "postId" | "pageId" | "customId" | "author" | "content" | "email"
> & {
  post?: PostReference | null;
  page?: PageReference | null;
  custom?: PostReference | null;
};
export type CommentNotificationSetting = Pick<
  InferSelectModel<typeof schema.setting>,
  "siteName"
>;

/**
 * 根据评论关联的文章、页面或自定义内容生成邮件展示目标。
 *
 * @param comment 评论通知数据。
 * @returns 邮件标题和前台访问链接。
 */
export function getCommentTarget(comment: CommentNotification) {
  const frontDomain = new URL(clientEnv.NEXT_PUBLIC_SITE_URL ?? "").host;
  if (comment.postId)
    return {
      postTitle: comment.post?.title?.zh ?? "",
      postLink: `https://${frontDomain}/archives/${comment.postId}`,
    };
  if (comment.pageId)
    return {
      postTitle: comment.page?.title?.zh ?? "",
      postLink: `https://${frontDomain}/pages/${comment.pageId}`,
    };
  return { postTitle: comment.custom?.title?.zh ?? "", postLink: "" };
}
