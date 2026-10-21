import { expect, it } from "vitest";
import { metricValue, taskDurationDelta } from "./performance-metrics";

it.each(["TaskDuration", "JSHeapUsedSize"])(
  "requires a finite nonnegative %s sample",
  (name) => {
    expect(() => metricValue([], name)).toThrow(name);
    expect(() => metricValue([{ name: "unrelated", value: 1 }], name)).toThrow(
      name,
    );
    for (const value of [NaN, Infinity, -Infinity, -1]) {
      expect(() => metricValue([{ name, value }], name)).toThrow(name);
    }
    for (const value of [0, 1.5]) {
      expect(metricValue([{ name, value }], name)).toBe(value);
    }
  },
);

it("reports absolute CPU work independently of pure waiting", () => {
  expect(taskDurationDelta).toEqual(expect.any(Function));
  const work = taskDurationDelta(2, 2.5);
  expect(work).toBe(0.5);
  const wallSeconds = [1, 10];
  expect(wallSeconds.map((wall) => (work / wall) * 100)).toEqual([50, 5]);
  // The absolute smoke budget remains 0.5 seconds in either case.
  expect(wallSeconds.map(() => taskDurationDelta(2, 2.5))).toEqual([0.5, 0.5]);
});

it("rejects reset or invalid task-duration counters instead of reporting less work", () => {
  expect(taskDurationDelta).toEqual(expect.any(Function));
  expect(taskDurationDelta(2, 2)).toBe(0);
  for (const [before, after] of [
    [3, 2],
    [-1, 2],
    [0, Infinity],
    [NaN, 1],
  ] as const) {
    expect(() => taskDurationDelta(before, after)).toThrow(/TaskDuration/);
  }
});
