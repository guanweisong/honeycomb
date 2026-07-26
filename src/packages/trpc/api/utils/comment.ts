import type { InferSelectModel } from "drizzle-orm";
import { clientEnv } from "@/env/client";
import * as schema from "@/packages/db/schema";
import type { CommentRecord } from "@/packages/trpc/api/modules/comment/types/comment.model";

/**
 * 评论形状类型定义。
 * 描述了评论对象及其关联的文章、页面或自定义内容的结构，主要用于邮件通知等场景。
 */
type PostReference = Pick<
  InferSelectModel<typeof schema.post>,
  "id" | "title"
>;
type PageReference = Pick<
  InferSelectModel<typeof schema.page>,
  "id" | "title"
>;

export type CommentShape = Pick<
  CommentRecord,
  | "id"
  | "postId"
  | "pageId"
  | "customId"
  | "author"
  | "content"
  | "email"
> & {
  post?: PostReference | null;
  page?: PageReference | null;
  custom?: PostReference | null;
};

/**
 * 从评论对象中提取关联的文章、页面或自定义内容的标题和链接。
 * 主要用于构建评论通知邮件中的跳转链接和标题。
 * @param {CommentShape} comment - 评论对象。
 * @param {object} [opts] - 可选参数。
 * @param {string} [opts.frontDomain] - 前端域名，默认为环境变量中的站点 host。
 * @returns {{ postTitle: string; postLink: string }} 包含标题和链接的对象。
 */
export const getPostOrPageOrCustomTitleAndLinkFromComment = (
  comment: CommentShape,
  opts?: { frontDomain?: string },
): { postTitle: string; postLink: string } => {
  const frontDomain =
    opts?.frontDomain ??
    new URL(clientEnv.NEXT_PUBLIC_SITE_URL as string).host;

  let postTitle = "";
  let postLink = "";

  if (comment.postId) {
    postTitle = comment.post?.title?.zh ?? "";
    postLink = `https://${frontDomain}/archives/${comment.postId}`;
  } else if (comment.pageId) {
    postTitle = comment.page?.title?.zh ?? "";
    postLink = `https://${frontDomain}/pages/${comment.pageId}`;
  } else if (comment.customId) {
    postTitle = comment.custom?.title?.zh ?? "";
  }
  return { postTitle, postLink };
};
