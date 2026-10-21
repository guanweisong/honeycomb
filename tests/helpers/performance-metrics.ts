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

interface PerformanceSample {
  navigationStart: number;
  timestamp: number;
  taskDuration: number;
}

/** Never infer work by subtracting counters belonging to different documents. */
export function taskDurationSegment(
  before: PerformanceSample,
  after: PerformanceSample,
) {
  for (const sample of [before, after]) {
    if (
      !Number.isFinite(sample.navigationStart) ||
      sample.navigationStart < 0 ||
      !Number.isFinite(sample.timestamp) ||
      sample.timestamp < 0
    ) {
      throw new Error("Invalid performance sampling clock");
    }
    taskDurationDelta(0, sample.taskDuration);
  }
  const wallSeconds = after.timestamp - before.timestamp;
  if (wallSeconds <= 0) {
    throw new Error("Performance sampling clock did not advance");
  }
  const interval = { before, after, wallSeconds };
  if (before.navigationStart !== after.navigationStart) {
    return {
      ...interval,
      kind: "navigation-boundary" as const,
      taskSeconds: null,
      cpuPercent: null,
    };
  }
  const taskSeconds = taskDurationDelta(
    before.taskDuration,
    after.taskDuration,
  );
  return {
    ...interval,
    kind: "same-document" as const,
    taskSeconds,
    cpuPercent: (taskSeconds / wallSeconds) * 100,
  };
}
