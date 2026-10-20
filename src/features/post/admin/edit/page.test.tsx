import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  readOnly: false,
  loadError: null as string | null,
  retryLoad: vi.fn(),
  baselineVersion: 1,
  creationToken: null as string | null,
  submitted: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("./hooks/use-post-editor", () => ({
  usePostEditor: () => {
    const baselineVersion = state.baselineVersion;
    const creationToken = state.creationToken;
    return {
      readOnly: state.readOnly,
      loadError: state.loadError,
      retryLoad: state.retryLoad,
      form: {},
      loading: state.readOnly,
      actionsKey: `account-a:new:${baselineVersion}:${creationToken ?? "none"}`,
      creationAttempt: creationToken ? { token: creationToken } : null,
      creationResult: { data: null, refetch: vi.fn() },
      submit: async () => {
        state.submitted({ baselineVersion, creationToken });
        return true;
      },
    };
  },
}));
vi.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./components/PostTypeFields", () => ({
  PostTypeFields: () => <input aria-label="Title" />,
}));
vi.mock("./components/PostSidebarFields", () => ({
  PostSidebarFields: () => <button type="button">Choose cover</button>,
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => true,
}));
vi.mock("@/features/media/components/PhotoPicker/index", () => ({
  default: () => null,
}));
vi.mock("@/features/media/shared/MediaPageShell", () => ({
  MediaPageShell: () => null,
}));
vi.mock("../../../category/admin/components/AddCategoryModal", () => ({
  default: () => null,
}));
vi.mock("@/components/LoadingState", () => ({ default: () => null }));

import PostDetail from "./page";
import { AdminLayoutActionsContext } from "@/components/admin/layout-context";

function LayoutHarness() {
  const [actions, setActions] = useState<React.ReactNode>(null);
  return (
    <AdminLayoutActionsContext.Provider value={{ setActions }}>
      <header>{actions}</header>
      <PostDetail />
    </AdminLayoutActionsContext.Provider>
  );
}

describe("post editor interaction boundary", () => {
  const container = document.createElement("div");
  let root = createRoot(container);
  afterEach(async () => {
    await act(async () => root.unmount());
    root = createRoot(container);
    state.loadError = null;
    state.retryLoad.mockClear();
    state.baselineVersion = 1;
    state.creationToken = null;
    state.submitted.mockClear();
  });

  it.each(["baseline", "recovered-attempt"])(
    "refreshes the real layout header submit callback when %s changes",
    async (change) => {
      state.readOnly = false;
      await act(async () => root.render(<LayoutHarness />));
      const save = () => {
        const button = Array.from(
          container.querySelectorAll<HTMLButtonElement>("header button"),
        ).find((candidate) => candidate.textContent === "保存草稿");
        if (!button) throw new Error("Expected save action in layout header");
        return button;
      };
      await act(async () => save().click());
      expect(state.submitted).toHaveBeenLastCalledWith({
        baselineVersion: 1,
        creationToken: null,
      });
      if (change === "baseline") state.baselineVersion = 2;
      else state.creationToken = "recovered-token";
      await act(async () => root.render(<LayoutHarness />));
      await act(async () => save().click());
      expect(state.submitted).toHaveBeenLastCalledWith({
        baselineVersion: change === "baseline" ? 2 : 1,
        creationToken:
          change === "recovered-attempt" ? "recovered-token" : null,
      });
    },
  );

  it("prevents native form submission outside the explicit save actions", async () => {
    state.readOnly = false;
    await act(async () => root.render(<PostDetail />));
    const event = new Event("submit", { bubbles: true, cancelable: true });
    container.querySelector("form")?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
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
