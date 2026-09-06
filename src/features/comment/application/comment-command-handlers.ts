import { CommentStatus } from "@/packages/domain/content/comment";
import { CommentAggregate } from "../domain/comment";
import type { CommentCommandRepository, CommentUpdate } from "./repository";

export async function moderateComment(
  repository: Pick<CommentCommandRepository, "update">,
  input: CommentUpdate & { currentStatus: CommentStatus; status: CommentStatus },
) {
  const aggregate = CommentAggregate.rehydrate(input.id, input.currentStatus);
  aggregate.moderate(input.status);
  const { currentStatus, ...update } = input;
  // currentStatus 只用于领域聚合重建，不写回持久化层。
  void currentStatus;
  return repository.update(update);
}
