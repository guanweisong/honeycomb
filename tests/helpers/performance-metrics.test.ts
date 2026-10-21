import { expect, it } from "vitest";
import {
  metricValue,
  taskDurationDelta,
  taskDurationSegment,
} from "./performance-metrics";

it.each(["TaskDuration", "JSHeapUsedSize", "NavigationStart", "Timestamp"])(
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
  // The absolute work measurement remains 0.5 seconds in either case.
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

it("measures same-document work with the browser monotonic sampling interval", () => {
  expect(taskDurationSegment).toEqual(expect.any(Function));
  expect(
    taskDurationSegment(
      { navigationStart: 100, timestamp: 102, taskDuration: 0.25 },
      { navigationStart: 100, timestamp: 103, taskDuration: 0.75 },
    ),
  ).toMatchObject({
    kind: "same-document",
    wallSeconds: 1,
    taskSeconds: 0.5,
    cpuPercent: 50,
  });
});

it.each([0.349503, 1.5])(
  "does not subtract counters across documents even when the new counter is %s",
  (taskDuration) => {
    expect(taskDurationSegment).toEqual(expect.any(Function));
    const before = {
      navigationStart: 100,
      timestamp: 102,
      taskDuration: 0.400682,
    };
    const after = { navigationStart: 103, timestamp: 104, taskDuration };
    expect(taskDurationSegment(before, after)).toEqual({
      kind: "navigation-boundary",
      before,
      after,
      wallSeconds: 2,
      taskSeconds: null,
      cpuPercent: null,
    });
  },
);

it("still rejects a counter reset within one document", () => {
  expect(taskDurationSegment).toEqual(expect.any(Function));
  expect(() =>
    taskDurationSegment(
      { navigationStart: 100, timestamp: 102, taskDuration: 0.4 },
      { navigationStart: 100, timestamp: 103, taskDuration: 0.3 },
    ),
  ).toThrow(/TaskDuration/);
});

it("does not dilute the steady-state CPU gate with earlier interaction wall time", () => {
  expect(taskDurationSegment).toEqual(expect.any(Function));
  const busy = taskDurationSegment(
    { navigationStart: 100, timestamp: 102, taskDuration: 4 },
    { navigationStart: 100, timestamp: 103, taskDuration: 4.9 },
  );
  expect(busy.kind).toBe("same-document");
  expect(busy.cpuPercent).toBeGreaterThan(70);
});

it("rejects missing, invalid, or non-increasing sampling clocks", () => {
  expect(taskDurationSegment).toEqual(expect.any(Function));
  const before = { navigationStart: 100, timestamp: 102, taskDuration: 0.4 };
  for (const after of [
    { navigationStart: NaN, timestamp: 103, taskDuration: 0.5 },
    { navigationStart: 100, timestamp: 102, taskDuration: 0.5 },
    { navigationStart: 100, timestamp: Infinity, taskDuration: 0.5 },
    { navigationStart: 103, timestamp: 104, taskDuration: NaN },
  ]) {
    expect(() => taskDurationSegment(before, after)).toThrow();
  }
});
