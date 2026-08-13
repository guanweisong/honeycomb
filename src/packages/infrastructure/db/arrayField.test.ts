import { describe, expect, it } from "vitest";
import { arrayField } from "./arrayField";

describe("arrayField", () => {
  it("serializes arrays for the database driver", () => {
    const field = arrayField<string>("tags");
    const config = (field as unknown as { config: { customTypeParams: {
      toDriver: (value: string[]) => string;
    } } }).config.customTypeParams as {
      toDriver: (value: string[]) => string;
    };

    expect(config.toDriver(["one", "two"])).toBe('["one","two"]');
    expect(config.toDriver([])).toBe("[]");
  });

  it("restores arrays from database values", () => {
    const field = arrayField<number>("scores");
    const config = (field as unknown as { config: { customTypeParams: {
      fromDriver: (value: string) => number[];
    } } }).config.customTypeParams as {
      fromDriver: (value: string) => number[];
    };

    expect(config.fromDriver("[1,2,3]")).toEqual([1, 2, 3]);
    expect(config.fromDriver("")).toEqual([]);
  });
});
