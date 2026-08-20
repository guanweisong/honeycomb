import { CommentStatus } from "@/packages/domain/content/comment";
import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { CommentAggregate } from "./domain/comment";
import type { CommentCommandRepository, CommentUpdate } from "./repository";

export async function moderateComment(
  repository: CommentCommandRepository,
  input: CommentUpdate & { currentStatus: CommentStatus; status: CommentStatus },
  bus?: InProcessEventBus,
) {
  const aggregate = CommentAggregate.rehydrate(input.id, input.currentStatus);
  aggregate.moderate(input.status);
  const { currentStatus, ...update } = input;
  // currentStatus 只用于领域聚合重建，不写回持久化层。
  void currentStatus;
  const result = await repository.update(update);
  for (const event of aggregate.pullEvents()) await bus?.publish(event);
  return result;
}
