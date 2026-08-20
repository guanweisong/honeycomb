/** 应用层错误，供 transport 统一映射，避免依赖错误消息字符串。 */
export class ApplicationError extends Error {
  readonly kind = "application" as const;

  constructor(
    public readonly code: "FORBIDDEN" | "UNAUTHORIZED" | "NOT_FOUND" | "BAD_REQUEST",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ApplicationError";
  }
}
