import { expect, it } from "vitest";
import { metricValue } from "./performance-metrics";

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
