import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  calls: [] as unknown[],
  detail: { id: "page-42" },
  refetch: vi.fn(),
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({
      post: { adminIndex: { invalidate: async () => {} } },
      page: { adminIndex: { invalidate: async () => {} } },
    }),
    page: {
      creationResult: { useQuery: () => ({ data: null }) },
      adminDetail: {
        useQuery: (input: unknown, options: unknown) => {
          trpcMocks.calls.push([input, options]);
          return {
            data: trpcMocks.detail,
            refetch: trpcMocks.refetch,
            error: { data: { code: "NOT_FOUND" } },
          };
        },
      },
    },
  },
}));

const editorMocks = vi.hoisted(() => ({ id: null as string | null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () =>
    new URLSearchParams(editorMocks.id ? `id=${editorMocks.id}` : ""),
}));
vi.mock("@/app/admin/(dashboard)/page/edit/page-editor-actions", () => ({
  usePageEditorActions: () => ({ loading: false }),
}));
vi.mock("@/app/admin/components/AdminLayout/layout-context", () => ({
  AdminPageHeader: () => null,
}));
vi.mock("@/app/admin/(dashboard)/providers/use-current-user", () => ({
  useCurrentUser: () => ({ user: null }),
}));
vi.mock("@/app/admin/(dashboard)/draft/use-local-draft", () => ({
  useLocalDraft: () => ({}),
}));
vi.mock("@/app/admin/(dashboard)/components/LocalDraftPrompt", () => ({
  LocalDraftPrompt: () => null,
}));
vi.mock("@/app/admin/(dashboard)/page/edit/components/PageEditorForm", () => ({
  PageEditorForm: () => null,
}));
vi.mock(
  "@/app/admin/(dashboard)/page/edit/components/PageEditorActionButtons",
  () => ({
    PageEditorActionButtons: () => null,
  }),
);
import { PageEditorPage } from "@/app/admin/(dashboard)/page/edit/components/PageEditorPage/index";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("page editor query", () => {
  describe("component query", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
      trpcMocks.calls.length = 0;
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    });

    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
    });

    it.each([
      [null, false],
      ["page-42", true],
    ])("binds id %s with enabled=%s", async (id, enabled) => {
      editorMocks.id = id;
      await act(async () => root.render(React.createElement(PageEditorPage)));
      expect(trpcMocks.calls.at(-1)).toEqual([
        { id: id ?? "" },
        { enabled, staleTime: 30_000 },
      ]);
    });
  });
});

vi.mock("@/app/admin/(dashboard)/page/edit/components/use-page-creation-result", async () => {
  const { trpc } = await import("@/lib/trpc/client/trpc");
  return {
    usePageCreationResult: (
      creationToken: string,
      _actorId: string | undefined,
      enabled: boolean,
    ) =>
      trpc.page.creationResult.useQuery(
        { creationToken },
        { enabled, retry: false },
      ),
  };
});
