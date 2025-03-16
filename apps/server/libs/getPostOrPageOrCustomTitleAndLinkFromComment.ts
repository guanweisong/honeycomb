import { Comment } from ".prisma/client";
import * as process from "process";

export const getPostOrPageOrCustomTitleAndLinkFromComment = (
  comment: Comment,
) => {
  let postTitle = "";
  let postLink = "";
  if (comment.postId) {
    // @ts-ignore
    postTitle = comment.post.title.zh;
    postLink = `https://${process.env.FRONT_DOMAIN}/archives/${comment.postId}`;
  } else if (comment.pageId) {
    // @ts-ignore
    postTitle = comment.page.title.zh;
    postLink = `https://${process.env.FRONT_DOMAIN}/pages/${comment.pageId}`;
  } else if (comment.customId) {
    // @ts-ignore
    postTitle = comment.custom.title.zh;
    if (comment.customId === process.env.LINK_OBJECT_ID) {
      postLink = `https://${process.env.FRONT_DOMAIN}/links`;
    }
  }
  return { postTitle, postLink };
};
