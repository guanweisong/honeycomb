/** Missing CDP samples must fail the budget rather than count as zero work. */
export function metricValue(
  metrics: Array<{ name: string; value: number }>,
  name: string,
): number {
  const value = metrics.find((metric) => metric.name === name)?.value;
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    throw new Error(`Missing or invalid performance metric: ${name}`);
  }
  return value;
}

/** Absolute browser main-thread work; pure wall-clock waiting cannot dilute it. */
export function taskDurationDelta(before: number, after: number): number {
  if (
    !Number.isFinite(before) ||
    !Number.isFinite(after) ||
    before < 0 ||
    after < before
  ) {
    throw new Error("Invalid or reset TaskDuration counter");
  }
  return after - before;
}
