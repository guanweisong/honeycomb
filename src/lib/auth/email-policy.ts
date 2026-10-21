/** Match Better Auth email normalization without changing username semantics. */
export function normalizeEmail(email: string): string {
  return email.toLowerCase();
}
