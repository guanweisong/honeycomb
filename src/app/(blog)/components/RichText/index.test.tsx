import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} {...props} />
  ),
}));

vi.mock("@/app/(blog)/components/PhotoSwipe", () => ({
  PhotoSwipeClient: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="photo-swipe">{children}</section>
  ),
}));

import { RichText } from ".";

const image = {
  key: "cover-key",
  url: "https://cdn.example.test/cover.jpg",
  name: "封面图",
  width: 1200,
  height: 800,
};

describe("RichText", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  const render = (props: { html?: string; images?: object[] }) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(React.createElement(RichText, props as never)));
  };

  it("parses text and wraps known images for PhotoSwipe", () => {
    render({
      html: `<p>正文</p><img src="${image.url}" />`,
      images: [image],
    });

    expect(
      container.querySelector('[data-testid="photo-swipe"]'),
    ).not.toBeNull();
    expect(container.querySelector("p")?.textContent).toBe("正文");
    const link = container.querySelector(
      'a[href="https://cdn.example.test/cover.jpg"]',
    );
    expect(link?.getAttribute("data-pswp-width")).toBe("1200");
    expect(link?.getAttribute("data-pswp-height")).toBe("800");
    expect(link?.querySelector("img")?.alt).toBe("封面图");
  });

  it("does not promote images absent from the media list to a gallery item", () => {
    render({
      html: '<p>正文</p><img src="https://cdn.example.test/missing.jpg" />',
    });

    expect(container.querySelector("p")?.textContent).toBe("正文");
    expect(container.querySelector("a[data-pswp-width]")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://cdn.example.test/missing.jpg",
    );
  });

  it("renders nothing when html is empty", () => {
    render({ html: "" });

    expect(container.firstElementChild).toBeNull();
  });
});
