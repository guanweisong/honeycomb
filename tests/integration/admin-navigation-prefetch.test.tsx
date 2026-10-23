import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/app/_trpc/router";
import { observable } from "@trpc/server/observable";
import { TRPCClientError } from "@trpc/client";
import { waitFor } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminQueryClient } from "@/app/admin/lib/admin-query-client";
import { trpc } from "@/lib/trpc/client/trpc";
import { adminDetailQueryOptions } from "@/components/admin/config/query-options";
import PostListClient from "@/features/post/admin/list/components/PostListClient";
import PageList from "@/features/page/admin/list/page";

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => true,
}));
vi.mock("@/components/MultiLangText", () => ({
  default: ({ text }: { text?: { zh?: string } }) => <span>{text?.zh}</span>,
}));
vi.mock("@/components/DynamicForm", () => ({ DynamicForm: () => null }));
// Keep native anchor and intent events; framework route prefetch requires production E2E.
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

async function setup(
  resource: "post" | "page",
  failedAttempts = 0,
  rejectDelete = false,
) {
  const reads: { path: string; input: unknown }[] = [];
  let detailAttempts = 0;
  let deleted = false;
  const client = trpc.createClient({
    links: [
      () =>
        ({ op }) =>
          observable((observer) => {
            reads.push({ path: op.path, input: op.input });
            if (op.type === "mutation") {
              if (rejectDelete) {
                observer.error(
                  TRPCClientError.from(new Error("write rejected")),
                );
                return;
              }
              deleted = true;
              observer.next({ result: { data: { success: true } } });
            } else if (op.path.endsWith("adminDetail")) {
              detailAttempts++;
              if (detailAttempts <= failedAttempts) {
                observer.error(TRPCClientError.from(new Error("offline")));
                return;
              }
              observer.next({
                result: { data: { id: "record-1", title: { zh: "ready" } } },
              });
            } else {
              observer.next({
                result: {
                  data: {
                    list: deleted
                      ? []
                      : [
                          {
                            id: "record-1",
                            title: { zh: "first" },
                            version: 1,
                            status: "DRAFT",
                            type: "ARTICLE",
                          },
                          {
                            id: "record-2",
                            title: { zh: "second" },
                            version: 1,
                            status: "DRAFT",
                            type: "ARTICLE",
                          },
                        ],
                    total: deleted ? 0 : 2,
                  },
                },
              });
            }
            observer.complete();
          }),
    ],
  });
  const queryClient = createAdminQueryClient();
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  function wrap(children: React.ReactNode) {
    return (
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={client} queryClient={queryClient}>
          {children}
        </trpc.Provider>
      </QueryClientProvider>
    );
  }
  await act(async () =>
    root.render(wrap(resource === "post" ? <PostListClient /> : <PageList />)),
  );
  const settle = async () => {
    await act(async () => {
      await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    });
  };
  await settle();
  await act(async () => {
    await waitFor(() => expect(container.textContent).toContain("first"));
  });
  cleanups.push(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
  });
  const editLabel = resource === "post" ? "编辑文章" : "编辑页面";
  function link() {
    const anchor = container.querySelector<HTMLAnchorElement>(
      `a[aria-label="${editLabel}"]`,
    );
    if (!anchor) throw new Error("Missing editor link");
    return anchor;
  }
  return {
    reads,
    client,
    queryClient,
    container,
    link,
    settle,
    async consumeDetail() {
      function Detail() {
        // Consumer uses the same production options as both real editors.
        const options = adminDetailQueryOptions;
        const post = trpc.post.adminDetail.useQuery(
          { id: "record-1" },
          { ...options, enabled: resource === "post" },
        );
        const page = trpc.page.adminDetail.useQuery(
          { id: "record-1" },
          { ...options, enabled: resource === "page" },
        );
        return <span>{(resource === "post" ? post.data : page.data)?.id}</span>;
      }
      await act(async () => root.render(wrap(<Detail />)));
      await settle();
      await act(async () => {
        await waitFor(() =>
          expect(container.textContent).toContain("record-1"),
        );
      });
    },
  };
}

describe.each(["post", "page"] as const)("%s navigation", (resource) => {
  it("invalidates other fresh list inputs after deletion without duplicating the active refresh", async () => {
    const view = await setup(resource);
    const alternateInput = { page: 2, limit: 20, title: "filter" };
    const alternateKey = getQueryKey(
      trpc[resource].adminIndex,
      alternateInput,
      "query",
    );
    view.queryClient.setQueryData(alternateKey, {
      list: [{ id: "record-1" }],
      total: 1,
    });
    const deleteLabel = resource === "post" ? "删除文章" : "删除页面";
    const trigger = view.container.querySelector<HTMLButtonElement>(
      `button[aria-label="${deleteLabel}"]`,
    );
    if (!trigger) throw new Error("Missing delete action");
    await act(async () => trigger.click());
    const confirm = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "确定",
    );
    if (!confirm) throw new Error("Missing confirmation");
    await act(async () => confirm.click());
    await view.settle();
    expect(view.queryClient.getQueryState(alternateKey)?.isInvalidated).toBe(
      true,
    );
    expect(
      view.reads.filter((read) => read.path === `${resource}.adminIndex`),
    ).toHaveLength(2);
    const refreshed = await view.queryClient.fetchQuery<
      inferRouterOutputs<AppRouter>["post" | "page"]["adminIndex"]
    >({
      queryKey: alternateKey,
      staleTime: 60_000,
      queryFn: () => view.client[resource].adminIndex.query(alternateInput),
    });
    expect(refreshed.list).toEqual([]);
    expect(
      view.reads.filter((read) => read.path === `${resource}.destroy`),
    ).toHaveLength(1);
  });
  it("does not invalidate or replay a rejected deletion", async () => {
    const view = await setup(resource, 0, true);
    const alternateKey = getQueryKey(
      trpc[resource].adminIndex,
      { page: 2, limit: 20 },
      "query",
    );
    view.queryClient.setQueryData(alternateKey, {
      list: [{ id: "record-1" }],
      total: 1,
    });
    const deleteLabel = resource === "post" ? "删除文章" : "删除页面";
    const trigger = view.container.querySelector<HTMLButtonElement>(
      `button[aria-label="${deleteLabel}"]`,
    );
    if (!trigger) throw new Error("Missing delete action");
    await act(async () => trigger.click());
    const confirm = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "确定",
    );
    if (!confirm) throw new Error("Missing confirmation");
    await act(async () => confirm.click());
    await view.settle();
    expect(view.queryClient.getQueryState(alternateKey)?.isInvalidated).toBe(
      false,
    );
    expect(
      view.reads.filter((read) => read.path === `${resource}.adminIndex`),
    ).toHaveLength(1);
    expect(
      view.reads.filter((read) => read.path === `${resource}.destroy`),
    ).toHaveLength(1);
  });
  it("starts one canonical 20-row query with the real table and QueryClient", async () => {
    const view = await setup(resource);
    expect(view.reads).toEqual([
      {
        path: `${resource}.adminIndex`,
        input: {
          page: 1,
          limit: 20,
          sortField: "updatedAt",
          sortOrder: "desc",
        },
      },
    ]);
  });
  it("renders native create/edit links and prefetches only the intended detail, shared with navigation", async () => {
    const view = await setup(resource);
    expect(
      view.container.querySelector(`a[href="/admin/${resource}/edit"]`),
    ).not.toBeNull();
    expect(view.link().getAttribute("href")).toBe(
      `/admin/${resource}/edit?id=record-1`,
    );
    expect(
      view.reads.filter((read) => read.path.endsWith("adminDetail")),
    ).toHaveLength(0);
    await act(async () =>
      view.link().dispatchEvent(new MouseEvent("mouseover", { bubbles: true })),
    );
    await view.settle();
    await act(async () => view.link().focus());
    await view.settle();
    expect(
      view.reads.filter((read) => read.path.endsWith("adminDetail")),
    ).toEqual([{ path: `${resource}.adminDetail`, input: { id: "record-1" } }]);
    await view.consumeDetail();
    expect(
      view.reads.filter((read) => read.path.endsWith("adminDetail")),
    ).toHaveLength(1);
    expect(view.container.textContent).toContain("record-1");
  });
  it("keeps the consumer retry policy after a non-retrying intent prefetch", async () => {
    const view = await setup(resource, 2);
    await act(async () =>
      view.link().dispatchEvent(new MouseEvent("mouseover", { bubbles: true })),
    );
    await view.settle();
    expect(
      view.reads.filter((read) => read.path.endsWith("adminDetail")),
    ).toHaveLength(1);
    await view.consumeDetail();
    expect(
      view.reads.filter((read) => read.path.endsWith("adminDetail")),
    ).toHaveLength(3);
    expect(view.container.textContent).toContain("record-1");
  });
  it("silently tolerates failed intent prefetch and retries when the detail mounts", async () => {
    const view = await setup(resource, 1);
    await act(async () =>
      view.link().dispatchEvent(new MouseEvent("mouseover", { bubbles: true })),
    );
    await view.settle();
    expect(
      view.reads.filter((read) => read.path.endsWith("adminDetail")),
    ).toHaveLength(1);
    expect(view.container.textContent).not.toContain("offline");
    await view.consumeDetail();
    expect(
      view.reads.filter((read) => read.path.endsWith("adminDetail")),
    ).toHaveLength(2);
    expect(view.container.textContent).toContain("record-1");
  });
});
