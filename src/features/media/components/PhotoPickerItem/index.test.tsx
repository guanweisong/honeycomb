import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-hook-form", () => ({
  useFormContext: () => ({ control: { name: "form-control" } }),
}));

vi.mock("@/components/ui/form", () => ({
  FormField: ({ render }: { render: () => React.ReactNode }) => render(),
  FormItem: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => React.createElement("div", { className }, children),
  FormMessage: () => React.createElement("div", { "data-testid": "message" }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    void _variant,
    React.createElement("button", props, children)
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    void _priority,
    React.createElement("img", props)
  ),
}));

import PhotoPickerItem, { type PhotoPickerItemProps } from "./index";

describe("PhotoPickerItem", () => {
  let container: HTMLDivElement;
  let root: Root;
  let actions: string[];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    actions = [];
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderPicker(cover?: PhotoPickerItemProps["cover"]) {
    await act(async () => {
      root.render(
        React.createElement(PhotoPickerItem, {
          cover,
          handlePhotoClear: () => actions.push("clear"),
          openPhotoPicker: () => actions.push("open"),
          size: "1920*1080",
          title: "封面",
        }),
      );
    });
  }

  async function click(text: string) {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.includes(text),
    );
    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  it("offers upload when no cover is selected", async () => {
    await renderPicker();

    expect(container.textContent).toContain("封面 （尺寸：1920*1080）");
    expect(container.querySelector("img")).toBeNull();
    await click("点击上传");
    expect(actions).toEqual(["open"]);
  });

  it("shows a recovered cover reference without displaying a stale image", async () => {
    await act(async () =>
      root.render(
        <PhotoPickerItem
          coverId="recovered-cover"
          title="封面"
          size="1920*1080"
          openPhotoPicker={() => actions.push("open")}
          handlePhotoClear={() => actions.push("clear")}
        />,
      ),
    );
    expect(container.textContent).toContain("已恢复封面选择");
    expect(container.querySelector("img")).toBeNull();
    await click("清除图片");
    expect(actions).toEqual(["clear"]);
  });

  it("uses safe preview dimensions and exposes replace and clear actions", async () => {
    await renderPicker({
      id: "cover-1",
      url: "/cover.jpg",
      width: null,
      height: null,
    });

    const image = container.querySelector("img");
    expect(image?.getAttribute("src")).toBe("/cover.jpg");
    expect(image?.getAttribute("alt")).toBe("封面预览");
    expect(image?.getAttribute("width")).toBe("960");
    expect(image?.getAttribute("height")).toBe("540");
    await click("重新上传");
    await click("清除图片");
    expect(actions).toEqual(["open", "clear"]);
  });

  it("preserves stored preview dimensions", async () => {
    await renderPicker({
      height: 720,
      id: "cover-1",
      url: "/cover.jpg",
      width: 1280,
    });

    const image = container.querySelector("img");
    expect(image?.getAttribute("width")).toBe("1280");
    expect(image?.getAttribute("height")).toBe("720");
  });
});
