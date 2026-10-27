import { describe, expect, it } from "vitest";
import { routing } from "@/lib/i18n/routing";

describe("唯一写入契约及边界行为", () => {
  it("保留路由语言顺序", () => {
    expect(routing.locales).toEqual(["en", "zh"]);
  });
});
