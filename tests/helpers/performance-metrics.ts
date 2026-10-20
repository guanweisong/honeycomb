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
