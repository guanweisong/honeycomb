import { PageStatus } from "@/packages/domain/content/page";
import {
  aggregateId,
  type AggregateId,
  type DomainEvent,
} from "@/packages/domain/core/aggregate";
import { InvalidStateTransitionError } from "@/packages/domain/core/domain-error";

export type PagePublishedEvent = DomainEvent<"page.published", { from: PageStatus }>;
export type PageWithdrawnEvent = DomainEvent<"page.withdrawn", { from: PageStatus }>;

export class PageAggregate {
  private readonly pendingEvents: Array<PagePublishedEvent | PageWithdrawnEvent> = [];

  private constructor(readonly id: AggregateId, private status: PageStatus) {}

  static rehydrate(id: string, status: PageStatus): PageAggregate {
    return new PageAggregate(aggregateId(id), status);
  }

  get currentStatus(): PageStatus {
    return this.status;
  }

  publish(): void {
    if (this.status === PageStatus.PUBLISHED) {
      throw new InvalidStateTransitionError("页面已经发布");
    }
    const from = this.status;
    this.status = PageStatus.PUBLISHED;
    this.pendingEvents.push({
      name: "page.published",
      aggregateId: this.id,
      occurredAt: new Date(),
      payload: { from },
    });
  }

  withdraw(): void {
    if (this.status !== PageStatus.PUBLISHED) {
      throw new InvalidStateTransitionError("只有已发布页面可以撤回");
    }
    this.status = PageStatus.DRAFT;
    this.pendingEvents.push({
      name: "page.withdrawn",
      aggregateId: this.id,
      occurredAt: new Date(),
      payload: { from: PageStatus.PUBLISHED },
    });
  }

  pullEvents(): readonly (PagePublishedEvent | PageWithdrawnEvent)[] {
    const events = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return events;
  }
}
