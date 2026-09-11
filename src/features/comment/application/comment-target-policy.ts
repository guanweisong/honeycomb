import { ApplicationError } from "@/packages/application/errors";
import { PageStatus } from "@/packages/domain/content/page";
import { PostStatus } from "@/packages/domain/content/post-status";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { MenuType } from "@/packages/domain/navigation/menu";
import type {
  CommentRefInput,
  CommentTarget,
  CommentTargetReference,
  CommentTargetRepository,
  CommentTargetState,
} from "./repository";

export function toCommentTargetReference(
  target: CommentTarget,
): CommentTargetReference {
  const references: CommentTargetReference[] = [];
  if (target.postId) references.push({ type: "post", id: target.postId });
  if (target.pageId) references.push({ type: "page", id: target.pageId });
  if (target.customId) references.push({ type: "custom", id: target.customId });
  if (references.length !== 1)
    throw new ApplicationError("BAD_REQUEST", "评论必须且只能关联一个目标");
  return references[0]!;
}

export function toCommentTargetReferenceFromRef(
  input: CommentRefInput,
): CommentTargetReference {
  if (input.type === MenuType.CATEGORY) return { type: "post", id: input.id };
  if (input.type === MenuType.PAGE) return { type: "page", id: input.id };
  return { type: "custom", id: input.id };
}

export function assertPublicCommentTarget(
  target: CommentTargetReference,
  state: CommentTargetState | null,
) {
  if (!state) throw new ApplicationError("NOT_FOUND");
  if ((target.type === "page") !== (state.type === "page"))
    throw new ApplicationError("INTERNAL_SERVER_ERROR");
  if (state.type === "page") {
    if (state.status !== PageStatus.PUBLISHED)
      throw new ApplicationError("NOT_FOUND");
    return;
  }
  if (state.status !== PostStatus.PUBLISHED)
    throw new ApplicationError("NOT_FOUND");
  if (state.commentStatus !== EnableStatus.ENABLE)
    throw new ApplicationError("FORBIDDEN");
}

export async function assertPublicTarget(
  repository: CommentTargetRepository,
  target: CommentTargetReference,
) {
  assertPublicCommentTarget(target, await repository.findTarget(target));
}

export async function assertCommentParentMatches(
  repository: CommentTargetRepository,
  parentId: string,
  target: CommentTargetReference,
) {
  const parentTarget = await repository.findParentTarget(parentId);
  if (
    !parentTarget ||
    parentTarget.type !== target.type ||
    parentTarget.id !== target.id
  ) {
    throw new ApplicationError(
      "BAD_REQUEST",
      "Parent comment belongs to a different resource",
    );
  }
}
