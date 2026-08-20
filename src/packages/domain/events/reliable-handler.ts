import type { DomainEvent } from "../core/aggregate";

export interface EventFailure {
  event: DomainEvent;
  error: unknown;
  attempts: number;
}

export async function handleIdempotently(
  event: DomainEvent,
  handler: (event: DomainEvent) => void | Promise<void>,
  state: Set<string>,
  onFailure?: (failure: EventFailure) => void | Promise<void>,
  maxAttempts = 3,
): Promise<void> {
  const key = `${event.name}:${event.aggregateId}:${event.occurredAt.toISOString()}`;
  if (state.has(key)) return;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await handler(event);
      state.add(key);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) await onFailure?.({ event, error, attempts: attempt });
    }
  }
  throw lastError;
}
