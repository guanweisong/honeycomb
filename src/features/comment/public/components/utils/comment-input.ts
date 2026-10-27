import { MenuType } from "@/features/menu/types/menu.type";
import type { CommentInsertInput } from "@/features/comment/types/comment.insert";
import type { CommentIdentity } from "@/features/comment/public/components/hooks/use-comment-identity";

interface BuildCommentInputOptions {
  id: string;
  type: MenuType;
  identity: CommentIdentity;
  content: string;
  captchaToken?: string;
  parentId?: string;
}

export function buildCommentInput({
  id,
  type,
  identity,
  content,
  captchaToken,
  parentId,
}: BuildCommentInputOptions): CommentInsertInput {
  const data: CommentInsertInput = {
    ...identity,
    content,
    captchaToken,
  };

  if (type === MenuType.CATEGORY) data.postId = id;
  if (type === MenuType.PAGE) data.pageId = id;
  if (type === MenuType.CUSTOM) data.customId = id;
  if (parentId) data.parentId = parentId;
  return data;
}
