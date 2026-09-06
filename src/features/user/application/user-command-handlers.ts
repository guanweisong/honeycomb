import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { UserAggregate } from "../domain/user";
import type { UserCommandInput, UserCommandPort } from "./repository";

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
  changes?: UserUpdateFields,
) {
  const aggregate = UserAggregate.rehydrate(input.id, input.currentStatus, input.level);
  aggregate.changeStatus(input.status, input.actorLevel);
  return repository.update({ id: input.id, ...changes, status: input.status });
}
