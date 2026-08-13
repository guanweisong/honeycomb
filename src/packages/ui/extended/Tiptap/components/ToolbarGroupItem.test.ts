import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/packages/ui/components/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => React.createElement("button", { onClick }, children),
}));
vi.mock("@/packages/ui/components/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => React.createElement("span", null, children),
}));
vi.mock("@/packages/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => React.createElement("button", props, children),
}));

import { ToolbarGroupItem } from "./ToolbarGroupItem";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ToolbarGroupItem", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("renders the active item and invokes a selected command", async () => {
    const onClick = vi.fn();
    const editor = { isActive: vi.fn(() => true) };
    const group = {
      icon: React.createElement("span", null, "group"),
      label: "格式",
      items: [
        { icon: React.createElement("span", null, "bold"), label: "加粗", isActive: () => true, onClick },
      ],
    };

    await act(async () => root.render(React.createElement(ToolbarGroupItem, { editor: editor as never, group })));
    expect(container.textContent).toContain("加粗");
    await act(async () => {
      const buttons = container.querySelectorAll("button");
      buttons.item(buttons.length - 1).click();
    });
    expect(onClick).toHaveBeenCalledWith(editor);
  });
});
