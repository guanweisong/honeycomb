import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useScrolledPast } from "./use-scrolled-past";

let container: HTMLDivElement;
let root: Root | undefined;
function Harness({ threshold }: { threshold: number }) {
  return <span>{String(useScrolledPast(threshold))}</span>;
}
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root?.unmount());
  container.remove();
  vi.restoreAllMocks();
});

it("reads initial scroll position and changes only beyond the strict threshold", () => {
  const scrollY = vi.spyOn(window, "scrollY", "get").mockReturnValue(101);
  act(() => root?.render(<Harness threshold={100} />));
  expect(container.textContent).toBe("true");
  for (const [position, visible] of [
    [100, "false"],
    [99, "false"],
    [101, "true"],
  ] as const) {
    scrollY.mockReturnValue(position);
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(container.textContent).toBe(visible);
  }
});

it("rechecks changed thresholds and removes each passive subscription", () => {
  vi.spyOn(window, "scrollY", "get").mockReturnValue(150);
  const add = vi.spyOn(window, "addEventListener");
  const remove = vi.spyOn(window, "removeEventListener");
  act(() => root?.render(<Harness threshold={100} />));
  const first = add.mock.calls.find(([event]) => event === "scroll");
  expect(first).toEqual(["scroll", expect.any(Function), { passive: true }]);
  expect(container.textContent).toBe("true");
  act(() => root?.render(<Harness threshold={200} />));
  expect(container.textContent).toBe("false");
  expect(remove).toHaveBeenCalledWith("scroll", first?.[1]);
  const second = add.mock.calls.filter(([event]) => event === "scroll")[1];
  act(() => root?.unmount());
  root = undefined;
  expect(remove).toHaveBeenCalledWith("scroll", second?.[1]);
  expect(
    remove.mock.calls.filter(([event]) => event === "scroll"),
  ).toHaveLength(2);
});
