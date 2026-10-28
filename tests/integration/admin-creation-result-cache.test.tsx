import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { getQueryKey } from "@trpc/react-query";
import { observable } from "@trpc/server/observable";
import { waitFor } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client/trpc";
import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";
import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
import { writePostCreationAttempt } from "@/features/post/admin/edit/utils/post-draft";
import { writePageCreationAttempt } from "@/features/page/admin/edit/page-draft";
import PostDetail from "@/features/post/admin/edit/page";
import { PageEditorPage } from "@/features/page/admin/edit/components/PageEditorPage";

const state = vi.hoisted(() => ({ userId: "owner-a", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: state.userId, level: "ADMIN" } }),
  useCan: () => true,
}));
vi.mock("@/components/admin/layout-context", () => ({
  AdminPageHeader: () => null,
}));
vi.mock("@/features/page/admin/edit/components/PageEditorForm", () => ({
  PageEditorForm: () => null,
}));
vi.mock(
  "@/features/page/admin/edit/components/PageEditorActionButtons",
  () => ({ PageEditorActionButtons: () => null }),
);

vi.mock("@/features/post/admin/edit/components/PostTypeFields", () => ({
  PostTypeFields: () => null,
}));
vi.mock("@/features/post/admin/edit/components/PostSidebarFields", () => ({
  PostSidebarFields: () => null,
}));
vi.mock("@/features/media/admin/components/PhotoPicker/index", () => ({
  default: () => null,
}));
vi.mock("@/features/media/admin/components/MediaPageShell", () => ({
  MediaPageShell: () => null,
}));
vi.mock("@/features/category/admin/components/CategoryFormDialog", () => ({
  default: () => null,
}));

describe("creation-result cache ownership with a real delayed tRPC transport", () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;
  beforeEach(() => {
    localStorage.clear();
    state.userId = "owner-a";
    state.push.mockClear();
    container = document.createElement("div");
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
  });

  it.each(
    (["post", "page"] as const).flatMap((kind) =>
      (["mounted", "unmount", "account", "manual"] as const).flatMap(
        (lifecycle) =>
          (["success", "missing", "error"] as const).map((outcome) => ({
            kind,
            lifecycle,
            outcome,
          })),
      ),
    ),
  )(
    "owns automatic $kind confirmation after $lifecycle with $outcome",
    async ({ kind, lifecycle, outcome }) => {
      const creationToken = crypto.randomUUID();
      if (kind === "post")
        expect(
          writePostCreationAttempt(
            state.userId,
            PostInsertSchema.parse({
              creationToken,
              type: "QUOTE",
              categoryId: "category-a",
              quoteContent: { zh: "Quote" },
            }),
          ),
        ).toBe(true);
      else
        expect(
          writePageCreationAttempt(
            state.userId,
            PageInsertSchema.parse({
              creationToken,
              title: { zh: "Page", en: "Page" },
              content: { zh: "Body", en: "Body" },
              template: "default",
            }),
          ),
        ).toBe(true);
      const inputs = [
        { page: 1, limit: 20 },
        { page: 2, limit: 20 },
      ];
      const keys = inputs.map((input) =>
        getQueryKey(trpc[kind].adminIndex, input, "query"),
      );
      keys.forEach((key) =>
        queryClient.setQueryData(key, { title: "Old title" }),
      );
      let confirm: (() => void) | undefined;
      let requests = 0;
      let initialManualRead = lifecycle === "manual";
      const client = trpc.createClient({
        links: [
          () =>
            ({ op }) =>
              observable((observer) => {
                if (op.path === `${kind}.creationResult`) {
                  requests++;
                  confirm = () => {
                    if (initialManualRead) {
                      initialManualRead = false;
                      observer.next({ result: { data: null } });
                      observer.complete();
                    } else if (outcome === "error")
                      observer.error(
                        TRPCClientError.from(
                          new Error("confirmation unavailable"),
                        ),
                      );
                    else {
                      observer.next({
                        result: {
                          data:
                            outcome === "success"
                              ? { id: "123456789012345678901234", version: 1 }
                              : null,
                        },
                      });
                      observer.complete();
                    }
                  };
                } else {
                  observer.next({ result: { data: [] } });
                  observer.complete();
                }
              }),
        ],
      });
      const render = (cache: QueryClient) =>
        act(async () =>
          root.render(
            <QueryClientProvider client={cache}>
              <trpc.Provider client={client} queryClient={cache}>
                {kind === "post" ? <PostDetail /> : <PageEditorPage />}
              </trpc.Provider>
            </QueryClientProvider>,
          ),
        );
      await render(queryClient);
      expect(confirm).toBeDefined();
      expect(
        keys.map((key) => queryClient.getQueryState(key)?.isInvalidated),
      ).toEqual([false, false]);
      const confirmedKey = getQueryKey(
        trpc[kind].creationResult,
        { creationToken },
        "query",
      );
      if (lifecycle === "manual") {
        await act(async () => {
          confirm?.();
          await waitFor(() =>
            expect(queryClient.getQueryState(confirmedKey)?.fetchStatus).toBe(
              "idle",
            ),
          );
        });
        expect(queryClient.getQueryData(confirmedKey)).toBeNull();
        const button = Array.from(container.querySelectorAll("button")).find(
          (item) =>
            item.textContent ===
            (kind === "post" ? "核对上次结果" : "核对上次结果并打开"),
        );
        expect(button).toBeDefined();
        await act(async () => button?.click());
        expect(requests).toBe(2);
      }
      let nextAccountCache: QueryClient | undefined;
      if (lifecycle === "unmount") await act(async () => root.render(null));
      if (lifecycle === "account") {
        state.userId = "owner-b";
        nextAccountCache = new QueryClient();
        keys.forEach((key) =>
          nextAccountCache?.setQueryData(key, { title: "Other account" }),
        );
        await render(nextAccountCache);
      }
      await act(async () => {
        confirm?.();
        await waitFor(() =>
          expect(queryClient.getQueryState(confirmedKey)?.fetchStatus).toBe(
            "idle",
          ),
        );
      });
      if (outcome === "success")
        expect(queryClient.getQueryData(confirmedKey)).toMatchObject({
          version: 1,
        });
      else if (outcome === "missing")
        expect(queryClient.getQueryData(confirmedKey)).toBeNull();
      else
        expect(queryClient.getQueryState(confirmedKey)?.status).toBe("error");
      expect(
        keys.map((key) => queryClient.getQueryState(key)?.isInvalidated),
      ).toEqual([outcome === "success", outcome === "success"]);
      if (lifecycle === "mounted") await render(queryClient);
      expect(requests).toBe(lifecycle === "manual" ? 2 : 1);
      if (nextAccountCache) {
        expect(
          keys.map((key) => nextAccountCache.getQueryState(key)?.isInvalidated),
        ).toEqual([false, false]);
        expect(nextAccountCache.getQueryData(confirmedKey)).toBeUndefined();
        nextAccountCache.clear();
      }
      if (lifecycle === "manual" && kind === "page" && outcome === "success")
        expect(state.push).toHaveBeenCalledWith(
          "/admin/page/edit?id=123456789012345678901234",
        );
      else expect(state.push).not.toHaveBeenCalled();
    },
  );
});
