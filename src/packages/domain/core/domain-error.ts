export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_STATE_TRANSITION");
  }
}
