import { expect, it } from "vitest";
import { first } from "../src/first";

it("covers the first source", () => {
  expect(first()).toBe(1);
});
