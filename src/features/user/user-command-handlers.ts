import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { UserAggregate } from "./domain/user";
import type { UserRepository } from "./repository";

export async function changeUserStatus(
  repository: UserRepository,
  input: { id: string; currentStatus: UserStatus; status: UserStatus; level: UserLevel; actorLevel: UserLevel },
  bus?: InProcessEventBus,
) {
  const aggregate = UserAggregate.rehydrate(input.id, input.currentStatus, input.level);
  aggregate.changeStatus(input.status, input.actorLevel);
  const result = await repository.update({ id: input.id, status: input.status });
  for (const event of aggregate.pullEvents()) await bus?.publish(event);
  return result;
}
