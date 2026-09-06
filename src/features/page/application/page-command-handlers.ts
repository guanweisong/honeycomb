import { PageStatus } from "@/packages/domain/content/page";
import { DomainError } from "@/packages/domain/core/domain-error";
import { PageAggregate } from "../domain/page";
import type { PageCommandRepository, PageUpdateCommand } from "./repository";

function isPageStatus(status: string): status is PageStatus {
  return Object.values(PageStatus).some((value) => value === status);
}

export async function publishPage(
  repository: Pick<PageCommandRepository, "update">,
  input: PageUpdateCommand & { status: PageStatus },
) {
  if (!input.status)
    throw new DomainError("发布页面必须提供当前状态", "MISSING_PAGE_STATUS");
  if (!isPageStatus(input.status))
    throw new DomainError("页面当前状态不合法", "INVALID_PAGE_STATUS");
  const aggregate = PageAggregate.rehydrate(input.id, input.status);
  aggregate.publish();
  return repository.update({
    ...input,
    status: PageStatus.PUBLISHED,
  });
}

export async function withdrawPage(
  repository: Pick<PageCommandRepository, "update">,
  input: PageUpdateCommand & { status: PageStatus },
) {
  if (!input.status)
    throw new DomainError("撤回页面必须提供当前状态", "MISSING_PAGE_STATUS");
  if (!isPageStatus(input.status))
    throw new DomainError("页面当前状态不合法", "INVALID_PAGE_STATUS");
  const aggregate = PageAggregate.rehydrate(input.id, input.status);
  aggregate.withdraw();
  return repository.update({
    ...input,
    status: PageStatus.DRAFT,
  });
}

/** 更新页面；状态变更必须经过 Page 聚合。 */
export async function updatePage(
  repository: Pick<PageCommandRepository, "findStatus" | "update">,
  input: PageUpdateCommand,
) {
  if (input.status === undefined) return repository.update(input);

  const currentStatus = await repository.findStatus(input.id);
  if (!currentStatus) throw new DomainError("页面不存在", "PAGE_NOT_FOUND");
  if (currentStatus === input.status) return repository.update(input);

  if (input.status === PageStatus.PUBLISHED) {
    return publishPage(repository, { ...input, status: currentStatus });
  }
  if (input.status === PageStatus.DRAFT) {
    return withdrawPage(repository, { ...input, status: currentStatus });
  }
  throw new DomainError(
    `页面不支持变更为 ${input.status}`,
    "INVALID_PAGE_STATUS",
  );
}
