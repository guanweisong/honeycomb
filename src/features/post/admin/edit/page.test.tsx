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
  mediaModuleLoads: 0,
  setValue: vi.fn(),
  setCoverPreview: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("./hooks/use-post-editor", () => ({
  usePostEditor: () => {
    const [showPhotoPicker, setShowPhotoPicker] = useState(false);
    const baselineVersion = state.baselineVersion;
    const creationToken = state.creationToken;
    return {
      readOnly: state.readOnly,
      loadError: state.loadError,
      retryLoad: state.retryLoad,
      form: { setValue: state.setValue },
      showPhotoPicker,
      setShowPhotoPicker,
      setCoverPreview: state.setCoverPreview,
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
  PostSidebarFields: ({
    editor,
  }: {
    editor: { setShowPhotoPicker: (show: boolean) => void };
  }) => (
    <button type="button" onClick={() => editor.setShowPhotoPicker(true)}>
      Choose cover
    </button>
  ),
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => true,
}));
vi.mock("@/components/Sheet", () => ({
  Sheet: ({
    children,
    onConfirm,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onConfirm: () => void;
    onOpenChange: () => void;
  }) => (
    <div>
      {children}
      <button type="button" onClick={onConfirm}>
        Confirm cover
      </button>
      <button type="button" onClick={onOpenChange}>
        Cancel cover
      </button>
    </div>
  ),
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn() } }));
vi.mock("@/features/media/admin/components/MediaPageShell", () => {
  state.mediaModuleLoads += 1;
  return {
    MediaPageShell: ({
      onSelect,
    }: {
      onSelect: (media: { id: string }) => void;
    }) => (
      <button type="button" onClick={() => onSelect({ id: "chosen-cover" })}>
        Select image
      </button>
    ),
  };
});
vi.mock("../../../category/admin/components/CategoryFormDialog", () => ({
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
    state.setValue.mockClear();
    state.setCoverPreview.mockClear();
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

// Importing the editor alone must not evaluate the optional media panel.
describe("post cover media loading", () => {
  it("loads the media module only on open and preserves cancel, selection and fresh sessions", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const click = async (text: string) => {
      const button = Array.from(container.querySelectorAll("button")).find(
        (item) => item.textContent === text,
      );
      if (!button) throw new Error(`Missing ${text}`);
      await act(async () => button.click());
    };
    try {
      state.readOnly = false;
      await act(async () => root.render(<PostDetail />));
      expect(state.mediaModuleLoads).toBe(0);
      expect(container.textContent).not.toContain("Select image");
      await click("Choose cover");
      expect(state.mediaModuleLoads).toBe(1);
      expect(container.textContent).toContain("Select image");
      await click("Select image");
      await click("Cancel cover");
      expect(state.setValue).not.toHaveBeenCalled();
      await click("Choose cover");
      await click("Confirm cover");
      expect(state.setValue).not.toHaveBeenCalled();
      await click("Select image");
      await click("Confirm cover");
      expect(state.setValue).toHaveBeenCalledExactlyOnceWith(
        "coverId",
        "chosen-cover",
        { shouldDirty: true },
      );
      expect(state.setCoverPreview).toHaveBeenCalledExactlyOnceWith({
        id: "chosen-cover",
      });
      expect(container.textContent).not.toContain("Select image");
    } finally {
      await act(async () => root.unmount());
    }
  });
});
