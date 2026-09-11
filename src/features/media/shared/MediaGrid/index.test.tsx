import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MediaGrid } from ".";
import type { MediaViewModel } from "../media-view-model";

vi.mock("@/features/contracts/admin/use-current-user", () => ({
  useCan: () => true,
}));
vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean },
  ) => {
    const imageProps = { ...props };
    delete imageProps.fill;
    return React.createElement("img", imageProps);
  },
}));
const media = {
  id: "media-1",
  name: "cover.png",
  type: "image/png",
  size: 1,
  key: "cover.png",
  url: "https://example.test/cover.png",
  width: null,
  height: null,
  color: null,
  createdAt: null,
  updatedAt: null,
} satisfies MediaViewModel;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("offers named focusable selection and independent copy/delete buttons", () => {
  const onSelect = vi.fn();
  act(() =>
    root.render(
      <MediaGrid media={[media]} onSelect={onSelect} onDelete={vi.fn()} />,
    ),
  );
  const select = container.querySelector<HTMLButtonElement>(
    'button[aria-label="选择 cover.png"]',
  );
  expect(select).not.toBeNull();
  select?.focus();
  expect(document.activeElement).toBe(select);
  act(() => select?.click());
  expect(onSelect).toHaveBeenCalledWith(media);
  expect(
    container.querySelector('button[aria-label="复制 cover.png 的链接"]'),
  ).not.toBeNull();
  expect(
    container.querySelector('button[aria-label="删除 cover.png"]'),
  ).not.toBeNull();
  expect(container.querySelector("button button")).toBeNull();
  const image = container.querySelector('img[alt="cover.png"]');
  expect(image).not.toBeNull();
  expect(image?.getAttribute("sizes")).toBe("128px");
});
it("distinguishes initial loading, empty and failed media", () => {
  const props = { onSelect: vi.fn(), onDelete: vi.fn() };
  act(() => root.render(<MediaGrid {...props} isLoading />));
  expect(container.querySelector('[role="status"]')?.textContent).toContain(
    "正在加载媒体",
  );
  act(() => root.render(<MediaGrid {...props} media={[]} />));
  expect(container.textContent).toContain("暂无媒体");
  expect(container.textContent).not.toContain("正在加载媒体");
  act(() => root.render(<MediaGrid {...props} media={[]} error="加载失败" />));
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "加载失败",
  );
  expect(container.textContent).not.toContain("暂无媒体");
});
