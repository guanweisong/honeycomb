import { PostStatus } from "@/packages/domain/content/post-status";
import { aggregateId, type AggregateId } from "@/packages/domain/core/aggregate";
import { InvalidStateTransitionError } from "@/packages/domain/core/domain-error";

export class PostAggregate {
  private constructor(readonly id: AggregateId, private status: PostStatus) {}

  static rehydrate(id: string, status: PostStatus): PostAggregate {
    return new PostAggregate(aggregateId(id), status);
  }

  get currentStatus(): PostStatus { return this.status; }

  publish(): void {
    if (this.status === PostStatus.PUBLISHED) {
      throw new InvalidStateTransitionError("文章已经发布");
    }
    this.status = PostStatus.PUBLISHED;
  }

  withdraw(): void {
    if (this.status !== PostStatus.PUBLISHED) {
      throw new InvalidStateTransitionError("只有已发布文章可以撤回");
    }
    this.status = PostStatus.DRAFT;
  }
}
