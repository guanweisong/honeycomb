import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
import { MediaGrid } from ".";
import type { MediaRecord as MediaViewModel } from "@/features/media/types/media.record";

vi.mock("@/features/user/admin/use-current-user", () => ({
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
  vi.clearAllMocks();
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
it("keeps each preview in a 128px square card", () => {
  act(() =>
    root.render(
      <MediaGrid media={[media]} onSelect={vi.fn()} onDelete={vi.fn()} />,
    ),
  );
  const select = container.querySelector('button[aria-label="选择 cover.png"]');
  expect(select?.parentElement?.className.split(" ")).toEqual(
    expect.arrayContaining(["group", "relative", "w-32", "h-32"]),
  );
  expect(select?.className.split(" ")).toEqual(
    expect.arrayContaining(["absolute", "inset-0"]),
  );
  expect(
    container
      .querySelector('img[alt="cover.png"]')
      ?.classList.contains("object-contain"),
  ).toBe(true);
});
it("overlays actions with mobile visibility and desktop hover or focus reveal", () => {
  act(() =>
    root.render(
      <MediaGrid media={[media]} onSelect={vi.fn()} onDelete={vi.fn()} />,
    ),
  );
  const toolbar = container.querySelector(
    'button[aria-label="复制 cover.png 的链接"]',
  )?.parentElement;
  expect(toolbar?.className.split(" ")).toEqual(
    expect.arrayContaining([
      "absolute",
      "bottom-0",
      "inset-x-0",
      "bg-black/40",
      "opacity-100",
      "sm:opacity-0",
      "group-hover:opacity-100",
      "group-focus-within:opacity-100",
    ]),
  );
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
it("does not show lifecycle metadata and discloses unknown reference risk", async () => {
  act(() =>
    root.render(
      <MediaGrid
        media={[media]}
        onSelect={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(false)}
      />,
    ),
  );
  expect(container.textContent).not.toMatch(
    /未验证|可使用|检查状态|上传待确认/,
  );
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="删除 cover.png"]')
      ?.click(),
  );
  expect(document.body.textContent).toContain(
    "正文和外部网站的链接无法完整检查",
  );
  await act(async () =>
    Array.from(document.body.querySelectorAll("button"))
      .find((b) => b.textContent === "确定")
      ?.click(),
  );
  expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
});

it("disables links while their deletion request is pending", () => {
  act(() =>
    root.render(
      <MediaGrid
        media={[media]}
        unavailableIds={[media.id]}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />,
    ),
  );
  expect(
    container.querySelector<HTMLButtonElement>(
      '[aria-label="复制 cover.png 的链接"]',
    )?.disabled,
  ).toBe(true);
});

it("waits for clipboard completion before reporting success", async () => {
  let finish: (() => void) | undefined;
  const writeText = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  act(() =>
    root.render(
      <MediaGrid media={[media]} onSelect={vi.fn()} onDelete={vi.fn()} />,
    ),
  );
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="复制 cover.png 的链接"]')
      ?.click(),
  );
  expect(writeText).toHaveBeenCalledWith(media.url);
  expect(toast.success).not.toHaveBeenCalled();
  await act(async () => finish?.());
  expect(toast.success).toHaveBeenCalledWith("链接已复制");
});
it.each(["missing", "rejected"])(
  "provides a selectable manual URL when clipboard is %s",
  async (outcome) => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value:
        outcome === "missing"
          ? undefined
          : { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    act(() =>
      root.render(
        <MediaGrid media={[media]} onSelect={vi.fn()} onDelete={vi.fn()} />,
      ),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="复制 cover.png 的链接"]',
        )
        ?.click(),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("复制失败，请手动复制链接");
    expect(
      container.querySelector<HTMLInputElement>(
        '[aria-label="手动复制 cover.png 的链接"]',
      )?.value,
    ).toBe(media.url);
  },
);
