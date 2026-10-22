import { UserLevel } from "../types/user.level";
import { assertNonBlankId } from "@/lib/validation/nonblank-id";
import { DomainError } from "@/lib/errors/domain-error";

export function isProtectedUser(level: UserLevel): boolean {
  return level === UserLevel.ADMIN;
}

export function assertUserDeletable(id: string, level: UserLevel): void {
  assertNonBlankId(id);
  if (isProtectedUser(level)) {
    throw new DomainError("管理员账号不能删除", "PROTECTED_USER");
  }
}

export function assertUserLevelChange(
  id: string,
  current: UserLevel,
  next: UserLevel,
): void {
  assertNonBlankId(id);
  if (isProtectedUser(current) && next !== UserLevel.ADMIN) {
    throw new DomainError("管理员账号不能降级", "PROTECTED_USER");
  }
}

/** Always authorize against the persisted level, before applying any requested promotion. */
export function assertUserStatusChange(
  id: string,
  currentLevel: UserLevel,
  actorLevel: UserLevel,
): void {
  assertNonBlankId(id);
  if (isProtectedUser(currentLevel) && actorLevel !== UserLevel.ADMIN) {
    throw new DomainError("非管理员不能修改管理员账号", "PROTECTED_USER");
  }
}
