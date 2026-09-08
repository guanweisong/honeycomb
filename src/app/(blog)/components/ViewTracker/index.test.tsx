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

vi.mock("next-intl", () => ({
  useTranslations: () => (_key: string, values: { count: number }) =>
    `${values.count} 次浏览`,
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

  it("reports a post once and renders the mutation result", () => {
    act(() => root.render(<PostViewTracker id="post-1" initialViews={7} />));
    act(() => root.render(<PostViewTracker id="post-1" initialViews={7} />));

    expect(mockPostMutate).toHaveBeenCalledOnce();
    expect(container.textContent).toBe("7 次浏览");
    act(() => {
      mockPostMutate.mock.calls[0]?.[1]?.onSuccess({ views: 8 });
    });
    expect(container.textContent).toBe("8 次浏览");
  });

  it("uses the page mutation and keeps the fallback when it fails", () => {
    act(() => root.render(<PageViewTracker id="page-1" initialViews={3} />));

    expect(mockPageMutate).toHaveBeenCalledOnce();
    expect(container.textContent).toBe("3 次浏览");
    expect(mockPostMutate).not.toHaveBeenCalled();
  });
});
