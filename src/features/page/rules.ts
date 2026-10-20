import { PageStatus } from "./page-status";
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
      `${action}页面必须提供当前状态`,
      "MISSING_PAGE_STATUS",
    );
  if (!Object.values(PageStatus).some((value) => value === status)) {
    throw new DomainError("页面当前状态不合法", "INVALID_PAGE_STATUS");
  }
  if (!id.trim()) throw new Error("聚合标识不能为空");
}

export function getPagePublishStatus(
  id: string,
  currentStatus: string | undefined,
): PageStatus {
  validateCurrentStatus(id, currentStatus, "发布");
  if (currentStatus === PageStatus.PUBLISHED)
    throw new InvalidStateTransitionError("页面已经发布");
  return PageStatus.PUBLISHED;
}

export function getPageWithdrawStatus(
  id: string,
  currentStatus: string | undefined,
): PageStatus {
  validateCurrentStatus(id, currentStatus, "撤回");
  if (currentStatus !== PageStatus.PUBLISHED)
    throw new InvalidStateTransitionError("只有已发布页面可以撤回");
  return PageStatus.DRAFT;
}
