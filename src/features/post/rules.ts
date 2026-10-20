import { PostStatus } from "./post-status";
import {
  DomainError,
  InvalidStateTransitionError,
} from "@/lib/errors/domain-error";

function validateCurrentStatus(
  id: string,
  status: string | undefined,
  action: "发布" | "撤回",
): void {
  if (!status)
    throw new DomainError(
      `${action}文章必须提供当前状态`,
      "MISSING_POST_STATUS",
    );
  if (!Object.values(PostStatus).some((value) => value === status)) {
    throw new DomainError("文章当前状态不合法", "INVALID_POST_STATUS");
  }
  if (!id.trim()) throw new Error("聚合标识不能为空");
}

export function getPostPublishStatus(
  id: string,
  currentStatus: string | undefined,
): PostStatus {
  validateCurrentStatus(id, currentStatus, "发布");
  if (currentStatus === PostStatus.PUBLISHED)
    throw new InvalidStateTransitionError("文章已经发布");
  return PostStatus.PUBLISHED;
}

export function getPostWithdrawStatus(
  id: string,
  currentStatus: string | undefined,
): PostStatus {
  validateCurrentStatus(id, currentStatus, "撤回");
  if (currentStatus !== PostStatus.PUBLISHED)
    throw new InvalidStateTransitionError("只有已发布文章可以撤回");
  return PostStatus.DRAFT;
}
