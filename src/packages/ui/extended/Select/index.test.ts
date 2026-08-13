import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../components/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) =>
    React.createElement(
      "select",
      {
        value,
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
          onValueChange?.(event.target.value),
      },
      children,
    ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => children,
  SelectValue: ({ placeholder }: { placeholder?: string }) =>
    React.createElement("span", null, placeholder),
  SelectContent: ({ children }: { children: React.ReactNode }) => children,
  SelectItem: ({
    value,
    disabled,
    children,
  }: {
    value: string;
    disabled?: boolean;
    children: React.ReactNode;
  }) => React.createElement("option", { value, disabled }, children),
}));

import { Select } from "./index";

describe("Select", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("renders options and forwards the selected value", async () => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        React.createElement(Select, {
          value: "draft",
          placeholder: "选择状态",
          options: [
            { label: "草稿", value: "draft" },
            { label: "已发布", value: "published" },
          ],
          onChange,
        }),
      );
    });

    expect(container.querySelectorAll("option")).toHaveLength(2);
    expect(container.textContent).toContain("草稿");
    expect(container.textContent).toContain("已发布");

    await act(async () => {
      const select = container.querySelector("select")!;
      (select as HTMLSelectElement).value = "published";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith("published");
  });
});
