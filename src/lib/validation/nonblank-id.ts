/** Preserve the shared identity invariant without imposing an aggregate model. */
export function assertNonBlankId(value: string): void {
  if (!value.trim()) throw new Error("聚合标识不能为空");
}
