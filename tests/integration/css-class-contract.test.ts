// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cn, clsx } from "cn";

describe("application CSS class composition contract", () => {
  it("keeps navigation class concatenation distinct from conflict resolution", () => {
    expect(clsx("pl-3", { "pl-8": true, hidden: false })).toBe("pl-3 pl-8");
  });
  it("flattens nested and conditional inputs without emitting false values", () => {
    expect(
      cn("flex", [false, null, undefined, ["items-center"]], {
        hidden: false,
        block: true,
      }),
    ).toBe("items-center block");
  });
  it("lets consumer utilities override conflicting defaults", () => {
    expect(cn("px-2 py-1 text-sm", "px-4 text-lg")).toBe("py-1 px-4 text-lg");
  });
  it("resolves conflicts only within the same responsive and state variant", () => {
    expect(
      cn(
        "p-2 md:p-4 hover:bg-red-500",
        "md:p-6 hover:bg-blue-500 focus:bg-red-500",
      ),
    ).toBe("p-2 md:p-6 hover:bg-blue-500 focus:bg-red-500");
  });
  it("keeps project classes while resolving custom theme color conflicts", () => {
    expect(
      cn(
        "prose-editor link-light text-auto-front-gray/60",
        "text-auto-front-gray/80",
      ),
    ).toBe("prose-editor link-light text-auto-front-gray/80");
  });
  it("preserves arbitrary values and variants used by shared controls", () => {
    expect(
      cn(
        "w-[120px] data-[state=open]:bg-accent",
        "w-[240px] data-[state=open]:bg-primary",
      ),
    ).toBe("w-[240px] data-[state=open]:bg-primary");
  });
});
