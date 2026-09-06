import { PageStatus } from "@/packages/domain/content/page";
import {
  aggregateId,
  type AggregateId,
} from "@/packages/domain/core/aggregate";
import { InvalidStateTransitionError } from "@/packages/domain/core/domain-error";

export class PageAggregate {
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
    this.status = PageStatus.PUBLISHED;
  }

  withdraw(): void {
    if (this.status !== PageStatus.PUBLISHED) {
      throw new InvalidStateTransitionError("只有已发布页面可以撤回");
    }
    this.status = PageStatus.DRAFT;
  }
}
