import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  instances: [] as Array<{
    options: Record<string, unknown>;
    init: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("photoswipe/lightbox", () => ({
  default: class MockPhotoSwipeLightbox {
    options: Record<string, unknown>;
    init = vi.fn();
    destroy = vi.fn();

    constructor(options: Record<string, unknown>) {
      this.options = options;
      mocks.instances.push(this);
    }
  },
}));

import { PhotoSwipeClient } from ".";

describe("PhotoSwipeClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.instances.length = 0;
  });

  it("initializes a lightbox for gallery links and destroys it on unmount", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <PhotoSwipeClient>
          <a href="/cover.jpg" data-pswp-width="1200" data-pswp-height="800">
            cover
          </a>
        </PhotoSwipeClient>,
      ),
    );

    expect(mocks.instances).toHaveLength(1);
    expect(mocks.instances[0].options).toMatchObject({
      gallery: container.firstElementChild,
      children: "a[data-pswp-width]",
    });
    expect(mocks.instances[0].init).toHaveBeenCalledOnce();

    act(() => root.unmount());

    expect(mocks.instances[0].destroy).toHaveBeenCalledOnce();
  });

  it("preserves children without requiring gallery metadata", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root.render(<PhotoSwipeClient><p>正文</p></PhotoSwipeClient>));

    expect(container.textContent).toBe("正文");
    expect(mocks.instances[0].options.children).toBe("a[data-pswp-width]");
  });
});
