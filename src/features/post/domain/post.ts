import { PostStatus } from "@/packages/domain/content/post-status";
import { aggregateId, type AggregateId, type DomainEvent } from "@/packages/domain/core/aggregate";
import { InvalidStateTransitionError } from "@/packages/domain/core/domain-error";

export type PostPublishedEvent = DomainEvent<"post.published", { from: PostStatus }>;
export type PostWithdrawnEvent = DomainEvent<"post.withdrawn", { from: PostStatus }>;

export class PostAggregate {
  private readonly pendingEvents: Array<PostPublishedEvent | PostWithdrawnEvent> = [];

  private constructor(readonly id: AggregateId, private status: PostStatus) {}

  static rehydrate(id: string, status: PostStatus): PostAggregate {
    return new PostAggregate(aggregateId(id), status);
  }

  get currentStatus(): PostStatus { return this.status; }

  publish(): void {
    if (this.status === PostStatus.PUBLISHED) {
      throw new InvalidStateTransitionError("文章已经发布");
    }
    const from = this.status;
    this.status = PostStatus.PUBLISHED;
    this.pendingEvents.push({ name: "post.published", aggregateId: this.id, occurredAt: new Date(), payload: { from } });
  }

  withdraw(): void {
    if (this.status !== PostStatus.PUBLISHED) {
      throw new InvalidStateTransitionError("只有已发布文章可以撤回");
    }
    this.status = PostStatus.DRAFT;
    this.pendingEvents.push({ name: "post.withdrawn", aggregateId: this.id, occurredAt: new Date(), payload: { from: PostStatus.PUBLISHED } });
  }

  pullEvents(): readonly (PostPublishedEvent | PostWithdrawnEvent)[] {
    const events = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return events;
  }
}
