import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../Popover", () => ({
  Popover: ({ content }: { content: React.ReactNode }) => React.createElement("div", null, content),
}));
vi.mock("../../components/command", () => ({
  Command: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  CommandInput: (props: Record<string, unknown>) => React.createElement("input", props),
  CommandList: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  CommandItem: ({ children, onSelect, disabled }: { children: React.ReactNode; onSelect?: () => void; disabled?: boolean }) => React.createElement("button", { onClick: onSelect, disabled }, children),
}));
vi.mock("../../components/checkbox", () => ({
  Checkbox: ({ checked }: { checked?: boolean }) => React.createElement("input", { type: "checkbox", checked, readOnly: true }),
}));

import { MultiSelect } from "./index";

describe("MultiSelect", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it("toggles selected options and preserves disabled options", async () => {
    const onChange = vi.fn();
    await act(async () => root.render(React.createElement(MultiSelect, {
      trigger: React.createElement("button", null, "选择"),
      value: ["one"],
      onChange,
      options: [
        { label: "一", value: "one" },
        { label: "二", value: "two" },
        { label: "禁用", value: "disabled", disabled: true },
      ],
    })));

    const buttons = container.querySelectorAll("button");
    await act(async () => buttons[0].click());
    expect(onChange).toHaveBeenCalledWith([]);
    await act(async () => buttons[1].click());
    expect(onChange).toHaveBeenCalledWith(["one", "two"]);
    expect(buttons[2].disabled).toBe(true);
  });
});
