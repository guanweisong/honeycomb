import { expect, it } from "vitest";
import { second } from "../src/second";

it("covers the second source", () => {
  expect(second()).toBe(2);
});
