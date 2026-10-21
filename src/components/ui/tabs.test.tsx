import { requireDefined } from "@tests/helpers/require-defined";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
describe("Tabs orientation contract", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  it("keeps a visible focus indicator on the keyboard-focusable panel", async () => {
    await act(async () =>
      root.render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
          </TabsList>
          <TabsContent value="one">First</TabsContent>
        </Tabs>,
      ),
    );
    const panel = container.querySelector<HTMLElement>('[role="tabpanel"]');
    await act(async () => panel?.focus());
    expect(document.activeElement).toBe(panel);
    expect(panel?.className).toContain("focus-visible:ring-2");
  });
  it.each(["vertical", "horizontal"] as const)(
    "uses %s arrow keys and skips disabled tabs",
    async (orientation) => {
      const onValueChange = vi.fn();
      await act(async () =>
        root.render(
          <Tabs
            orientation={orientation === "horizontal" ? undefined : orientation}
            defaultValue="one"
            onValueChange={onValueChange}
          >
            <TabsList>
              <TabsTrigger value="one">One</TabsTrigger>
              <TabsTrigger value="disabled" disabled>
                Disabled
              </TabsTrigger>
              <TabsTrigger value="two">Two</TabsTrigger>
            </TabsList>
            <TabsContent value="one">First</TabsContent>
            <TabsContent value="two">Second</TabsContent>
          </Tabs>,
        ),
      );
      expect(
        container
          .querySelector('[role="tablist"]')
          ?.getAttribute("aria-orientation"),
      ).toBe(orientation);
      const tabs =
        container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      const first = requireDefined(tabs[0]);
      await act(async () => first.focus());
      await act(async () => {
        first.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: orientation === "vertical" ? "ArrowDown" : "ArrowRight",
            bubbles: true,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 1));
      });
      expect(document.activeElement).toBe(tabs[2]);
      expect(onValueChange).toHaveBeenLastCalledWith("two");
    },
  );
});
