import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Form } from "@/components/ui/form";
import { LocalDraftPrompt } from "@/components/admin/draft/LocalDraftPrompt";
import { PageEditorPage } from "@/features/page/admin/edit/components/PageEditorPage";
import { usePostEditor } from "@/features/post/admin/edit/hooks/use-post-editor";
import { PostTypeFields } from "@/features/post/admin/edit/components/PostTypeFields";
import { PostSidebarFields } from "@/features/post/admin/edit/components/PostSidebarFields";

const observed = vi.hoisted(() => ({ dirty: false }));
const writes = vi.hoisted(() => vi.fn());
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: "draft-user", level: "ADMIN" } }),
  useCan: () => true,
}));
vi.mock("@/features/page/admin/edit/use-page-creation-result", () => ({
  usePageCreationResult: () => ({ data: null, refetch: vi.fn() }),
}));
vi.mock("@/features/post/admin/edit/hooks/use-post-creation-result", () => ({
  usePostCreationResult: () => ({ data: null, refetch: vi.fn() }),
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({}),
    category: { adminTree: { useQuery: () => ({ data: { list: [] } }) } },
    page: {
      adminDetail: { useQuery: () => ({ data: undefined, refetch: vi.fn() }) },
      create: { useMutation: () => ({ mutateAsync: writes }) },
      update: { useMutation: () => ({ mutateAsync: writes }) },
    },
    post: {
      adminDetail: { useQuery: () => ({ data: undefined, refetch: vi.fn() }) },
      create: { useMutation: () => ({ mutateAsync: writes }) },
      update: { useMutation: () => ({ mutateAsync: writes }) },
    },
  },
}));
// Keep real controllers and rich-text content; toolbar popovers are unrelated.
vi.mock("@/components/editor/config/toolbar-items", () => ({
  toolbarItems: [],
}));
vi.mock("@/features/page/admin/edit/components/PageEditorForm", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/page/admin/edit/components/PageEditorForm")
  >("@/features/page/admin/edit/components/PageEditorForm");
  return {
    PageEditorForm: (
      props: React.ComponentProps<typeof actual.PageEditorForm>,
    ) => {
      const dirty = props.form.formState.isDirty;
      React.useEffect(() => {
        observed.dirty = dirty;
      }, [dirty]);
      return <actual.PageEditorForm {...props} />;
    },
  };
});

function PostHarness() {
  const editor = usePostEditor(null);
  const dirty = editor.form.formState.isDirty;
  React.useEffect(() => {
    observed.dirty = dirty;
  }, [dirty]);
  return (
    <>
      <LocalDraftPrompt {...editor.draft} />
      <Form {...editor.form}>
        <form>
          <PostTypeFields type={editor.type} />
          <PostSidebarFields
            categories={editor.category?.list}
            onCreateCategory={() => {}}
            photoPickerProps={editor.photoPickerProps}
          />
        </form>
      </Form>
    </>
  );
}

for (const kind of ["post", "page"] as const) {
  describe(`${kind} real-field local draft lifecycle`, () => {
    let container: HTMLDivElement;
    let root: Root;
    const key = `honeycomb:draft:${kind}:draft-user:new`;
    const placeholder =
      kind === "post" ? "在此输入文章标题" : "在此输入页面标题";
    beforeEach(() => {
      localStorage.clear();
      writes.mockClear();
      container = document.createElement("div");
      document.body.append(container);
      root = createRoot(container);
    });
    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
      localStorage.clear();
    });
    async function mount(
      strict: boolean,
      mode: "visible" | "hidden" = "visible",
    ) {
      const editor = kind === "post" ? <PostHarness /> : <PageEditorPage />;
      await act(async () =>
        root.render(
          <React.Activity mode={mode}>
            {strict ? <React.StrictMode>{editor}</React.StrictMode> : editor}
          </React.Activity>,
        ),
      );
      if (mode === "hidden") return;
      await waitFor(() =>
        expect(
          container.querySelector('[contenteditable="true"]'),
        ).not.toBeNull(),
      );
    }
    it.each([false, true])(
      "preserves unsaved input across cached Activity hide/reveal (StrictMode: %s)",
      async (strict) => {
        await mount(strict);
        await act(async () =>
          fireEvent.change(
            within(container).getByPlaceholderText(placeholder),
            {
              target: { value: "保留缓存页面中的编辑" },
            },
          ),
        );
        await mount(strict, "hidden");
        await mount(strict);
        expect(
          within(container).getByPlaceholderText<HTMLInputElement>(placeholder)
            .value,
        ).toBe("保留缓存页面中的编辑");
        expect(observed.dirty).toBe(true);
        expect(writes).not.toHaveBeenCalled();
      },
    );
    async function reload(strict: boolean) {
      await act(async () => window.dispatchEvent(new Event("pagehide")));
      await act(async () => root.unmount());
      root = createRoot(container);
      await mount(strict);
    }
    it.each([false, true])(
      "does not back up pristine registered fields (StrictMode: %s)",
      async (strict) => {
        await mount(strict);
        expect(observed.dirty).toBe(false);
        await reload(strict);
        expect(localStorage.getItem(key)).toBeNull();
        expect(
          within(container).queryByRole("button", { name: "恢复草稿" }),
        ).toBeNull();
        expect(writes).not.toHaveBeenCalled();
      },
    );
    it.each([false, true])(
      "does not resurrect a discarded draft after restore and reload (StrictMode: %s)",
      async (strict) => {
        await mount(strict);
        await act(async () =>
          fireEvent.change(
            within(container).getByPlaceholderText(placeholder),
            { target: { value: "浏览器未保存草稿" } },
          ),
        );
        await reload(strict);
        await act(async () =>
          within(container).getByRole("button", { name: "恢复草稿" }).click(),
        );
        expect(
          within(container).getByPlaceholderText<HTMLInputElement>(placeholder)
            .value,
        ).toBe("浏览器未保存草稿");
        await reload(strict);
        await act(async () =>
          within(container).getByRole("button", { name: "丢弃草稿" }).click(),
        );
        expect(
          within(container).queryByRole("button", { name: "恢复草稿" }),
        ).toBeNull();
        expect(localStorage.getItem(key)).toBeNull();
        await reload(strict);
        expect(localStorage.getItem(key)).toBeNull();
        expect(
          within(container).queryByRole("button", { name: "恢复草稿" }),
        ).toBeNull();
        expect(writes).not.toHaveBeenCalled();
      },
    );
  });
}
