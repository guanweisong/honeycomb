/**
 * 评论形状类型定义。
 * 描述了评论对象及其关联的文章、页面或自定义内容的结构，主要用于邮件通知等场景。
 */
export type CommentShape = {
  id: string;
  postId?: string | null;
  pageId?: string | null;
  customId?: string | null;
  post?: { title?: { zh?: string; en?: string } } | null;
  page?: { title?: { zh?: string; en?: string } } | null;
  custom?: { title?: { zh?: string; en?: string } } | null;
};

/**
 * 从评论对象中提取关联的文章、页面或自定义内容的标题和链接。
 * 主要用于构建评论通知邮件中的跳转链接和标题。
 * @param {CommentShape} comment - 评论对象。
 * @param {object} [opts] - 可选参数。
 * @param {string} [opts.frontDomain] - 前端域名，默认为环境变量 `FRONT_DOMAIN`。
 * @param {string} [opts.linkObjectId] - 友情链接的 ObjectId，默认为环境变量 `LINK_OBJECT_ID`。
 * @returns {{ postTitle: string; postLink: string }} 包含标题和链接的对象。
 */
export const getPostOrPageOrCustomTitleAndLinkFromComment = (
  comment: CommentShape,
  opts?: { frontDomain?: string; linkObjectId?: string },
) => {
  const frontDomain = opts?.frontDomain ?? process.env.FRONT_DOMAIN ?? "";
  const linkObjectId = opts?.linkObjectId ?? process.env.LINK_OBJECT_ID;

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
    if (linkObjectId && comment.customId === linkObjectId) {
      postLink = `https://${frontDomain}/links`;
    }
  }
  return { postTitle, postLink };
};
