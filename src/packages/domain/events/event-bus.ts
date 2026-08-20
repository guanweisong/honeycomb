import type { DomainEvent } from "../core/aggregate";

export type DomainEventHandler<TEvent extends DomainEvent = DomainEvent> = (event: TEvent) => void | Promise<void>;

export class InProcessEventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  subscribe<TEvent extends DomainEvent>(name: TEvent["name"], handler: DomainEventHandler<TEvent>): () => void {
    const handlers = this.handlers.get(name) ?? new Set<DomainEventHandler>();
    handlers.add(handler as DomainEventHandler);
    this.handlers.set(name, handlers);
    return () => handlers.delete(handler as DomainEventHandler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = [...(this.handlers.get(event.name) ?? [])];
    const results = await Promise.allSettled(handlers.map((handler) => handler(event)));
    const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failure) throw failure.reason;
  }

  clear(): void { this.handlers.clear(); }
}
