export type CommentShape = {
  id: string;
  postId?: string | null;
  pageId?: string | null;
  customId?: string | null;
  post?: { title?: { zh?: string; en?: string } } | null;
  page?: { title?: { zh?: string; en?: string } } | null;
  custom?: { title?: { zh?: string; en?: string } } | null;
};

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
