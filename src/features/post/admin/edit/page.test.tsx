import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  readOnly: false,
  loadError: null as string | null,
  retryLoad: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("./hooks/use-post-editor", () => ({
  usePostEditor: () => ({
    readOnly: state.readOnly,
    loadError: state.loadError,
    retryLoad: state.retryLoad,
    form: {},
    loading: state.readOnly,
  }),
}));
vi.mock("@/packages/ui/components/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/packages/ui/extended/AdminLayout", () => ({
  useAdminLayoutActions: vi.fn(),
  useAdminLayoutPageTitle: vi.fn(),
}));
vi.mock("./components/PostTypeFields", () => ({
  PostTypeFields: () => <input aria-label="Title" />,
}));
vi.mock("./components/PostSidebarFields", () => ({
  PostSidebarFields: () => <button type="button">Choose cover</button>,
}));
vi.mock("./components/PostEditorActions", () => ({
  PostEditorActions: () => null,
}));
vi.mock("@/features/post/admin/edit/components/PhotoPicker", () => ({
  default: () => null,
}));
vi.mock("@/features/media/public", () => ({ MediaPageShell: () => null }));
vi.mock("../category/components/AddCategoryModal", () => ({
  default: () => null,
}));
vi.mock("@/packages/ui/extended/LoadingState", () => ({ default: () => null }));

import PostDetail from "./page";

describe("post editor interaction boundary", () => {
  const container = document.createElement("div");
  let root = createRoot(container);
  afterEach(async () => {
    await act(async () => root.unmount());
    root = createRoot(container);
    state.loadError = null;
    state.retryLoad.mockClear();
  });

  it.each([
    ["error", "文章加载失败"],
    ["not-found", "文章不存在或已被删除"],
  ])(
    "shows an actionable %s state outside the interaction lock",
    async (loadError, message) => {
      state.loadError = loadError;
      state.readOnly = true;
      await act(async () => root.render(<PostDetail />));
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        message,
      );
      expect(container.querySelector("[inert]")).toBeNull();
      expect(container.querySelector('a[href="/admin/post"]')).not.toBeNull();
      await act(async () => container.querySelector("button")?.click());
      expect(state.retryLoad).toHaveBeenCalledTimes(1);
    },
  );

  it.each([true, false])(
    "applies the creation/loading interaction lock: %s",
    async (readOnly) => {
      state.readOnly = readOnly;
      await act(async () => root.render(<PostDetail />));
      const wrapper = container.firstElementChild;
      expect(wrapper?.hasAttribute("inert")).toBe(readOnly);
      expect(wrapper?.getAttribute("aria-busy")).toBe(String(readOnly));
      expect(container.querySelector("input")).not.toBeNull();
    },
  );
});
