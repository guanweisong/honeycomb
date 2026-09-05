import type { DomainEvent } from "../core/aggregate";

export type DomainEventHandler<TEvent extends DomainEvent = DomainEvent> = (event: TEvent) => void | Promise<void>;

export class InProcessEventBus<TEvent extends DomainEvent = DomainEvent> {
  private readonly handlers = new Map<string, Set<DomainEventHandler<TEvent>>>();

  subscribe(name: TEvent["name"], handler: DomainEventHandler<TEvent>): () => void {
    const handlers = this.handlers.get(name) ?? new Set<DomainEventHandler<TEvent>>();
    handlers.add(handler);
    this.handlers.set(name, handlers);
    return () => handlers.delete(handler);
  }

  async publish(event: TEvent): Promise<void> {
    const handlers = [...(this.handlers.get(event.name) ?? [])];
    const results = await Promise.allSettled(handlers.map((handler) => handler(event)));
    const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failure) throw failure.reason;
  }

  clear(): void { this.handlers.clear(); }
}
