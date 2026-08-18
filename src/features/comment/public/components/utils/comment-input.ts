import { MenuType } from "@/packages/domain/navigation/menu";
import type { CommentInsertInput } from "@/packages/trpc/api/modules/comment/schemas/comment.insert.schema";
import type { CommentIdentity } from "../hooks/use-comment-identity";

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
  const data = {
    ...identity,
    content,
    captchaToken,
  } as CommentInsertInput;

  if (type === MenuType.CATEGORY) data.postId = id;
  if (type === MenuType.PAGE) data.pageId = id;
  if (type === MenuType.CUSTOM) data.customId = id;
  if (parentId) data.parentId = parentId;
  return data;
}
