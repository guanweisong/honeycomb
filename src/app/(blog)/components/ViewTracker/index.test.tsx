import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const mockPostMutate = vi.fn();
const mockPageMutate = vi.fn();

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    post: {
      incrementViews: { useMutation: () => ({ mutate: mockPostMutate }) },
    },
    page: {
      incrementViews: { useMutation: () => ({ mutate: mockPageMutate }) },
    },
  },
}));

import { PageViewTracker, PostViewTracker } from ".";

describe("ViewTracker", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockPostMutate.mockReset();
    mockPageMutate.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("reports a post only once while the same tracker remains mounted", () => {
    act(() => root.render(<PostViewTracker id="post-1" />));
    act(() => root.render(<PostViewTracker id="post-1" />));

    expect(mockPostMutate).toHaveBeenCalledOnce();
    expect(mockPostMutate).toHaveBeenCalledWith({ id: "post-1" });
  });

  it("uses the page mutation for page views", () => {
    act(() => root.render(<PageViewTracker id="page-1" />));

    expect(mockPageMutate).toHaveBeenCalledOnce();
    expect(mockPageMutate).toHaveBeenCalledWith({ id: "page-1" });
    expect(mockPostMutate).not.toHaveBeenCalled();
  });
});
