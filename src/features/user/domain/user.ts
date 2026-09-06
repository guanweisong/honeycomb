import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { aggregateId, type AggregateId } from "@/packages/domain/core/aggregate";
import { DomainError } from "@/packages/domain/core/domain-error";

export function isProtectedUser(level: UserLevel): boolean {
  return level === UserLevel.ADMIN;
}

export class UserAggregate {
  private constructor(
    readonly id: AggregateId,
    private status: UserStatus,
    private level: UserLevel,
  ) {}

  static rehydrate(id: string, status: UserStatus, level: UserLevel): UserAggregate {
    return new UserAggregate(aggregateId(id), status, level);
  }

  get currentStatus(): UserStatus { return this.status; }
  get currentLevel(): UserLevel { return this.level; }

  assertDeletable(): void {
    if (isProtectedUser(this.level)) {
      throw new DomainError("管理员账号不能删除", "PROTECTED_USER");
    }
  }

  changeLevel(to: UserLevel): void {
    if (isProtectedUser(this.level) && to !== UserLevel.ADMIN) {
      throw new DomainError("管理员账号不能降级", "PROTECTED_USER");
    }
    this.level = to;
  }

  changeStatus(to: UserStatus, actorLevel: UserLevel): void {
    if (isProtectedUser(this.level) && actorLevel !== UserLevel.ADMIN) {
      throw new DomainError("非管理员不能修改管理员账号", "PROTECTED_USER");
    }
    if (this.status === to) return;
    this.status = to;
  }
}
