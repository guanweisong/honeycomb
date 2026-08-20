import { CommentStatus } from "@/packages/domain/content/comment";
import {
  aggregateId,
  type AggregateId,
  type DomainEvent,
} from "@/packages/domain/core/aggregate";
import { InvalidStateTransitionError } from "@/packages/domain/core/domain-error";

export type CommentModeratedEvent = DomainEvent<"comment.moderated", {
  from: CommentStatus;
  to: CommentStatus;
}>;

const transitions: Record<CommentStatus, readonly CommentStatus[]> = {
  [CommentStatus.TO_AUDIT]: [CommentStatus.PUBLISH, CommentStatus.RUBBISH, CommentStatus.BAN],
  [CommentStatus.PUBLISH]: [CommentStatus.RUBBISH, CommentStatus.BAN],
  [CommentStatus.RUBBISH]: [CommentStatus.PUBLISH],
  [CommentStatus.BAN]: [CommentStatus.PUBLISH],
};

export class CommentAggregate {
  private readonly pendingEvents: CommentModeratedEvent[] = [];

  private constructor(
    readonly id: AggregateId,
    private status: CommentStatus,
  ) {}

  static rehydrate(id: string, status: CommentStatus): CommentAggregate {
    return new CommentAggregate(aggregateId(id), status);
  }

  get currentStatus(): CommentStatus {
    return this.status;
  }

  moderate(to: CommentStatus): void {
    if (!transitions[this.status].includes(to)) {
      throw new InvalidStateTransitionError(`评论不能从 ${this.status} 变更为 ${to}`);
    }
    const from = this.status;
    this.status = to;
    this.pendingEvents.push({
      name: "comment.moderated",
      aggregateId: this.id,
      occurredAt: new Date(),
      payload: { from, to },
    });
  }

  pullEvents(): readonly CommentModeratedEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return events;
  }
}
