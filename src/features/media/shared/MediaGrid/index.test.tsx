import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import type { MediaEntity } from "@/packages/trpc/api/outputs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("@/features/contracts/admin/use-current-user", () => ({
  useCan: () => false,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    const imageProps = { ...props };
    delete imageProps.fill;
    return React.createElement("img", imageProps);
  },
}));

import { MediaGrid } from "./index";

const imageMedia = {
  id: "media-1",
  name: "cover.png",
  type: "image/png",
  url: "https://cdn.example.test/cover.png",
} as MediaEntity;

describe("MediaGrid", () => {
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

  it("renders image media with its existing label and selects it on click", async () => {
    const onSelect = vi.fn();

    await act(async () => {
      root.render(
        React.createElement(MediaGrid, {
          media: [imageMedia],
          currentItem: undefined,
          onDelete: vi.fn(),
          onSelect,
        }),
      );
    });

    expect(container.querySelector('img[alt="cover.png"]')).not.toBeNull();
    const tile = container.querySelector('[title="cover.png"]');
    expect(tile).not.toBeNull();
    await act(async () =>
      tile?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(onSelect).toHaveBeenCalledWith(imageMedia);
  });
});
