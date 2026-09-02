import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
import { UserAggregate } from "../domain/user";
import type { UserCommandInput, UserCommandPort } from "../ports";

type UserStatusChangeInput = {
  id: string;
  currentStatus: UserStatus;
  status: UserStatus;
  level: UserLevel;
  actorLevel: UserLevel;
};

type UserUpdateFields = {
  password?: string;
} & Partial<Omit<UserCommandInput, "password" | "status">>;

export async function changeUserStatus(
  repository: Pick<UserCommandPort, "update">,
  input: UserStatusChangeInput,
  bus?: InProcessEventBus,
  changes?: UserUpdateFields,
) {
  const aggregate = UserAggregate.rehydrate(input.id, input.currentStatus, input.level);
  aggregate.changeStatus(input.status, input.actorLevel);
  const result = await repository.update({ id: input.id, ...changes, status: input.status });
  for (const event of aggregate.pullEvents()) await bus?.publish(event);
  return result;
}
