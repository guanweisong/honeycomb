export type AggregateId = string & { readonly __aggregateId: unique symbol };

export function aggregateId(value: string): AggregateId {
  if (!value.trim()) throw new Error("聚合标识不能为空");
  return value as AggregateId;
}

export interface DomainEvent<TName extends string = string, TPayload = unknown> {
  readonly name: TName;
  readonly aggregateId: AggregateId;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}
