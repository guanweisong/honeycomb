import { PostStatus } from "@/packages/domain/content/post-status";
import { DomainError } from "@/packages/domain/core/domain-error";
import { PostAggregate } from "./domain/post";
import type { PostCommandInput, PostCommandRepository } from "./repository";
import type { InProcessEventBus } from "@/packages/domain/events/event-bus";

/** 通过 Post 聚合执行发布命令，再交给 repository 持久化。 */
export async function publishPost(repository: PostCommandRepository, input: PostCommandInput & { id: string }, bus?: InProcessEventBus) {
  if (!input.status) throw new DomainError("发布文章必须提供当前状态", "MISSING_POST_STATUS");
  const aggregate = PostAggregate.rehydrate(input.id, input.status as PostStatus);
  aggregate.publish();
  const result = await repository.update({ ...input, status: PostStatus.PUBLISHED });
  for (const event of aggregate.pullEvents()) await bus?.publish(event);
  return result;
}

/** 通过 Post 聚合执行撤回命令，再交给 repository 持久化。 */
export async function withdrawPost(repository: PostCommandRepository, input: PostCommandInput & { id: string }, bus?: InProcessEventBus) {
  if (!input.status) throw new DomainError("撤回文章必须提供当前状态", "MISSING_POST_STATUS");
  const aggregate = PostAggregate.rehydrate(input.id, input.status as PostStatus);
  aggregate.withdraw();
  const result = await repository.update({ ...input, status: PostStatus.DRAFT });
  for (const event of aggregate.pullEvents()) await bus?.publish(event);
  return result;
}
