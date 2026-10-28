import React, { act } from "react";
import { within } from "@testing-library/dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkRecord } from "@/features/link/types/link.record";
import type { PageWithRelations } from "@/features/page/types/page.read-model";
import type { LinkListQueryInput } from "@/features/link/types/link.list";
import type { PageListQueryInput } from "@/features/page/types/page.list-query";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import { requireDefined } from "@tests/helpers/require-defined";

const mocks = vi.hoisted(() => {
  const links: LinkRecord[] = [];
  const pages: PageWithRelations[] = [];
  return {
    links,
    pages,
    fetching: false,
    linkQuery: vi.fn<(input: LinkListQueryInput) => void>(),
    pageQuery: vi.fn<(input: PageListQueryInput) => void>(),
    destroy: vi.fn(),
    refetch: vi.fn(),
  };
});

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => true,
}));
vi.mock("@/features/link/admin/components/LinkFormDialog", () => ({
  LinkFormDialog: () => null,
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({
      page: {
        adminDetail: { prefetch: vi.fn().mockResolvedValue(undefined) },
        adminIndex: { invalidate: vi.fn().mockResolvedValue(undefined) },
      },
    }),
    link: {
      adminIndex: {
        useQuery: (input: LinkListQueryInput) => {
          mocks.linkQuery(input);
          return {
            data: { list: mocks.links, total: 41 },
            isFetching: mocks.fetching,
            refetch: mocks.refetch,
          };
        },
      },
      create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
    page: {
      adminIndex: {
        useQuery: (input: PageListQueryInput) => {
          mocks.pageQuery(input);
          return {
            data: { list: mocks.pages, total: 41 },
            isFetching: mocks.fetching,
            refetch: mocks.refetch,
          };
        },
      },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
  },
}));

import { LinkPageShell } from "@/features/link/admin/components/LinkPageShell";
import Page from "@/features/page/admin/list/page";

function link(id: string): LinkRecord {
  return {
    id,
    name: "Old link",
    url: "https://example.test",
    logo: "https://example.test/logo.png",
    description: null,
    status: null,
    createdAt: null,
    updatedAt: null,
  };
}
function page(id: string, version = 1): PageWithRelations {
  return {
    id,
    version,
    authorId: "author",
    title: { zh: "旧页面", en: "Old page" },
    content: null,
    status: PageStatus.DRAFT,
    template: PageTemplate.DEFAULT,
    views: 0,
    createdAt: null,
    updatedAt: null,
    author: null,
    imagesInContent: [],
  };
}
function button(text: string) {
  return within(document.body).getByRole<HTMLButtonElement>("button", {
    name: text,
  });
}
async function search(container: HTMLElement, value: string) {
  const input = within(container).getByRole("textbox");
  const setter = requireDefined(
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set,
  );
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("查询").click());
}

// Keep the real table, toolbar form, checkboxes and confirmation dialog in this
// regression: mocking the table concealed the competing query owners.
describe.each(["link", "page"] as const)(
  "%s list selection boundary",
  (kind) => {
    let root: Root;
    let container: HTMLDivElement;
    const render = () =>
      root.render(kind === "link" ? <LinkPageShell /> : <Page />);
    const query = () => (kind === "link" ? mocks.linkQuery : mocks.pageQuery);
    const filter = kind === "link" ? "name" : "title";

    beforeEach(async () => {
      mocks.links = [link("link-1")];
      mocks.pages = [page("page-1")];
      mocks.fetching = false;
      mocks.linkQuery.mockClear();
      mocks.pageQuery.mockClear();
      mocks.destroy
        .mockReset()
        .mockResolvedValue({ success: true, publicSync: "completed" });
      mocks.refetch.mockReset().mockResolvedValue({ isSuccess: true });
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      await act(async () => render());
    });
    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
    });

    async function selectRow() {
      const checkbox = within(container).getByRole("checkbox", {
        name: `选择记录 ${kind}-1`,
      });
      await act(async () => checkbox.click());
    }

    it("clears hidden bulk targets when searching before replacement rows arrive", async () => {
      await selectRow();
      expect(button("批量删除").disabled).toBe(false);
      // Query keeps the old data snapshot during the pending search.
      mocks.fetching = true;
      await search(container, "new target");
      expect(button("批量删除").disabled).toBe(true);
      expect(query()).toHaveBeenLastCalledWith({
        sortField: "updatedAt",
        sortOrder: "desc",
        page: 1,
        limit: 20,
        [filter]: "new target",
      });
      await act(async () => button("批量删除").click());
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(mocks.destroy).not.toHaveBeenCalled();
      expect(
        container
          .querySelector('tbody button[role="checkbox"]')
          ?.getAttribute("data-state"),
      ).toBe("unchecked");
    });

    it("prevents keyboard activation of placeholder checkboxes from restoring bulk targets", async () => {
      await selectRow();
      mocks.fetching = true;
      await search(container, "pending target");
      const checkboxes = Array.from(
        container.querySelectorAll<HTMLButtonElement>(
          'button[role="checkbox"]',
        ),
      );
      for (const checkbox of checkboxes) {
        await act(async () => {
          checkbox.focus();
          checkbox.dispatchEvent(
            new KeyboardEvent("keydown", { key: " ", bubbles: true }),
          );
          checkbox.dispatchEvent(
            new KeyboardEvent("keyup", { key: " ", bubbles: true }),
          );
          // jsdom does not synthesize the native Space activation click.
          checkbox.click();
        });
        expect(button("批量删除").disabled).toBe(true);
        expect(checkbox.disabled).toBe(true);
      }
      await act(async () => button("批量删除").click());
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(mocks.destroy).not.toHaveBeenCalled();
    });

    it("preserves selection but disables changes during a same-query refresh", async () => {
      await selectRow();
      mocks.fetching = true;
      await act(async () => render());
      const checkbox = requireDefined(
        container.querySelector<HTMLButtonElement>(
          'tbody button[role="checkbox"]',
        ),
      );
      expect(checkbox.disabled).toBe(true);
      await act(async () => checkbox.click());
      expect(checkbox.getAttribute("data-state")).toBe("checked");
      mocks.fetching = false;
      await act(async () => render());
      expect(checkbox.disabled).toBe(false);
      expect(checkbox.getAttribute("data-state")).toBe("checked");
    });

    it("resets page on search and preserves that search on subsequent pagination and clearing", async () => {
      await act(async () => button("下一页").click());
      expect(query()).toHaveBeenLastCalledWith({
        sortField: "updatedAt",
        sortOrder: "desc",
        page: 2,
        limit: 20,
      });
      await search(container, "needle");
      expect(query()).toHaveBeenLastCalledWith({
        sortField: "updatedAt",
        sortOrder: "desc",
        page: 1,
        limit: 20,
        [filter]: "needle",
      });
      expect(container.textContent).toContain("第 1 / 3 页");
      await act(async () => button("下一页").click());
      expect(query()).toHaveBeenLastCalledWith({
        sortField: "updatedAt",
        sortOrder: "desc",
        page: 2,
        limit: 20,
        [filter]: "needle",
      });
      await search(container, "");
      expect(query()).toHaveBeenLastCalledWith({
        sortField: "updatedAt",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      });
    });

    it("keeps refreshed same-ID rows visibly selected and deletes the current snapshot", async () => {
      await selectRow();
      mocks.links = [link("link-1")];
      mocks.pages = [page("page-1", 2)];
      await act(async () => render());
      expect(
        container
          .querySelector('tbody button[role="checkbox"]')
          ?.getAttribute("data-state"),
      ).toBe("checked");
      await act(async () => button("批量删除").click());
      await act(async () => button("确定").click());
      expect(mocks.destroy).toHaveBeenCalledExactlyOnceWith(
        kind === "link"
          ? { ids: ["link-1"] }
          : { items: [{ id: "page-1", expectedVersion: 2 }] },
      );
    });

    it("removes selection when refreshed results no longer contain the row", async () => {
      await selectRow();
      mocks.links = [];
      mocks.pages = [];
      await act(async () => render());
      expect(button("批量删除").disabled).toBe(true);
      expect(container.textContent).toContain("暂无数据");
      expect(mocks.destroy).not.toHaveBeenCalled();
    });
  },
);
