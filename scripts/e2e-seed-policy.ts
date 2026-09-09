export function assertSafeE2ESeedTarget(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  if (environment.E2E_SEED !== "1") {
    throw new Error("E2E_SEED=1 is required before seeding test data");
  }
  const url = environment.TURSO_URL;
  if (!url) throw new Error("TURSO_URL is required for E2E seeding");
  if (!url.startsWith("file:") || /^file:\/\/[^/]/.test(url)) {
    throw new Error("E2E seed target must be a local file database");
  }
  return url;
}
