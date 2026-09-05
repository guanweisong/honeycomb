/** Establish fixture existence without asserting an unrelated target type. */
export function requireDefined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Expected a defined test value");
  }
  return value;
}
