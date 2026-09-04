import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { aggregateId, type AggregateId, type DomainEvent } from "@/packages/domain/core/aggregate";
import { DomainError } from "@/packages/domain/core/domain-error";

export type UserStatusChangedEvent = DomainEvent<"user.status-changed", { from: UserStatus; to: UserStatus }>;

export function isProtectedUser(level: UserLevel): boolean {
  return level === UserLevel.ADMIN;
}

export class UserAggregate {
  private readonly pendingEvents: UserStatusChangedEvent[] = [];

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
    const from = this.status;
    this.status = to;
    this.pendingEvents.push({ name: "user.status-changed", aggregateId: this.id, occurredAt: new Date(), payload: { from, to } });
  }

  pullEvents(): readonly UserStatusChangedEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return events;
  }
}
