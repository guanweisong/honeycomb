import { Captcha } from "@/src/types/Captcha";

export interface CommentCreate {
  postId?: string;
  pageId?: string;
  customId?: string;
  email: string;
  content: string;
  site?: string;
  author: string;
  captcha: Captcha;
  parentId?: string;
}
