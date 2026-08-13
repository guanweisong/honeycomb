import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../components/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  SheetContent: ({ children }: { children: React.ReactNode }) => React.createElement("section", null, children),
  SheetDescription: ({ children }: { children: React.ReactNode }) => React.createElement("p", null, children),
  SheetFooter: ({ children }: { children: React.ReactNode }) => React.createElement("footer", null, children),
  SheetHeader: ({ children }: { children: React.ReactNode }) => React.createElement("header", null, children),
  SheetTitle: ({ children }: { children: React.ReactNode }) => React.createElement("h2", null, children),
  SheetClose: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../../components/button", () => ({ Button: ({ children, ...props }: { children: React.ReactNode }) => React.createElement("button", props, children) }));

import { Sheet } from "./index";

describe("Sheet", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("renders the footer and invokes confirm", async () => {
    const onConfirm = vi.fn();
    await act(async () =>
      root.render(
        React.createElement(
          Sheet,
          {
            open: true,
            onOpenChange: vi.fn(),
            title: "编辑",
            description: "说明",
            showFooter: true,
            onConfirm,
          },
          React.createElement("span", null, "内容"),
        ),
      ),
    );
    expect(container.textContent).toContain("编辑");
    expect(container.textContent).toContain("内容");
    expect(container.querySelector("footer")).not.toBeNull();
    await act(async () => container.querySelector("footer button:last-child")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
