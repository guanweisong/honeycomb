import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  calls: [] as Array<[string, unknown]>,
  refetch: vi.fn(),
  remainingPages: [] as Array<{
    data?: { list: string[] };
    isLoading: boolean;
    isError?: boolean;
    isFetching?: boolean;
    refetch?: ReturnType<typeof vi.fn>;
  }>,
  pageError: false,
  categoryError: false,
  retryPage: vi.fn(),
  retryCategory: vi.fn(),
  pageTotal: undefined as number | undefined,
  menuError: false,
  menuFetching: false,
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useQueries: (
      build: (query: {
        page: {
          menuOptions: (input: { page: number; limit: number }) => unknown;
        };
      }) => unknown[],
    ) => {
      const requests = build({
        page: {
          menuOptions: (input) => {
            trpcMocks.calls.push(["remaining-page", input]);
            return input;
          },
        },
      });
      return requests.map((_, index) => trpcMocks.remainingPages[index]);
    },
    page: {
      menuOptions: {
        useQuery: (input: unknown) => {
          trpcMocks.calls.push(["page", input]);
          return {
            isError: trpcMocks.pageError,
            refetch: trpcMocks.retryPage,
            data: trpcMocks.pageError
              ? undefined
              : {
                  list: ["page"],
                  ...(trpcMocks.pageTotal === undefined
                    ? {}
                    : { total: trpcMocks.pageTotal }),
                },
          };
        },
      },
    },
    category: {
      adminTree: {
        useQuery: (input: unknown) => {
          trpcMocks.calls.push(["category", input]);
          return {
            data: { list: ["category"] },
            isError: trpcMocks.categoryError,
            refetch: trpcMocks.retryCategory,
          };
        },
      },
    },
    menu: {
      adminIndex: {
        useQuery: (input: unknown) => {
          trpcMocks.calls.push(["menu", input]);
          return {
            data: { list: ["menu"] },
            refetch: trpcMocks.refetch,
            isError: trpcMocks.menuError,
            isFetching: trpcMocks.menuFetching,
          };
        },
      },
    },
  },
}));

import { getMenuQueryInputs, useMenuQuery } from "@/features/menu/admin/menu-query";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("menu query inputs", () => {
  it("preserves the collection limits and unfiltered admin menu input", () => {
    expect(getMenuQueryInputs()).toEqual({
      page: { limit: 100 },
      category: undefined,
      menu: undefined,
    });
  });

  describe("hook", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
      trpcMocks.calls.length = 0;
      trpcMocks.pageError = false;
      trpcMocks.categoryError = false;
      trpcMocks.retryPage.mockReset();
      trpcMocks.retryCategory.mockReset();
      trpcMocks.remainingPages = [];
      trpcMocks.pageTotal = undefined;
      trpcMocks.menuError = false;
      trpcMocks.menuFetching = false;
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    });

    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
    });

    it("binds each input and returns the matching query result", async () => {
      let query: ReturnType<typeof useMenuQuery> | undefined;
      function Harness() {
        query = useMenuQuery();
        return null;
      }

      await act(async () => root.render(React.createElement(Harness)));

      expect(trpcMocks.calls).toEqual([
        ["page", { limit: 100 }],
        ["category", undefined],
        ["menu", undefined],
      ]);
      expect(query).toMatchObject({
        pageList: { list: ["page"] },
        categoryList: { list: ["category"] },
        checkedData: { list: ["menu"] },
        pageLoading: false,
        menuError: false,
        menuFetching: false,
        refetchMenu: trpcMocks.refetch,
      });
    });
    it("exposes a failed initial menu read and pending retry", async () => {
      trpcMocks.menuError = true;
      trpcMocks.menuFetching = true;
      let query: ReturnType<typeof useMenuQuery> | undefined;
      function Harness() {
        query = useMenuQuery();
        return null;
      }
      await act(async () => root.render(React.createElement(Harness)));
      expect(query).toMatchObject({ menuError: true, menuFetching: true });
    });

    it("retains successful options and retries only failed option requests", async () => {
      const retryMissingPage = vi.fn();
      trpcMocks.pageTotal = 201;
      trpcMocks.remainingPages = [
        { isLoading: false, isError: true, refetch: retryMissingPage },
        { data: { list: ["last"] }, isLoading: false },
      ];
      trpcMocks.categoryError = true;
      let query: ReturnType<typeof useMenuQuery> | undefined;
      function Harness() {
        query = useMenuQuery();
        return null;
      }
      await act(async () => root.render(React.createElement(Harness)));
      expect(query?.pageList?.list).toEqual(["page", "last"]);
      expect(query?.pageError).toBe(true);
      expect(query?.categoryError).toBe(true);
      await act(async () => {
        await query?.retryPages();
        await query?.retryCategory();
      });
      expect(retryMissingPage).toHaveBeenCalledOnce();
      expect(trpcMocks.retryCategory).toHaveBeenCalledOnce();
      expect(trpcMocks.retryPage).not.toHaveBeenCalled();
      expect(trpcMocks.refetch).not.toHaveBeenCalled();
      trpcMocks.remainingPages[0] = {
        data: { list: ["middle"] },
        isLoading: false,
      };
      await act(async () => root.render(React.createElement(Harness)));
      expect(query?.pageError).toBe(false);
      expect(query?.pageList?.list).toEqual(["page", "middle", "last"]);
    });
    it("exposes first page failure separately from the editable menu baseline", async () => {
      trpcMocks.pageError = true;
      let query: ReturnType<typeof useMenuQuery> | undefined;
      function Harness() {
        query = useMenuQuery();
        return null;
      }
      await act(async () => root.render(React.createElement(Harness)));
      expect(query?.pageError).toBe(true);
      await act(async () => query?.retryPages());
      expect(trpcMocks.retryPage).toHaveBeenCalledOnce();
      expect(query?.checkedData).toEqual({ list: ["menu"] });
    });

    it("includes page choices beyond the first bounded request", async () => {
      trpcMocks.remainingPages = [
        { data: { list: ["last-page"] }, isLoading: false },
      ];
      trpcMocks.pageTotal = 101;
      let pageList: ReturnType<typeof useMenuQuery>["pageList"];
      function Harness() {
        pageList = useMenuQuery().pageList;
        return null;
      }
      await act(async () => root.render(React.createElement(Harness)));
      expect(pageList?.list).toEqual(["page", "last-page"]);
      expect(trpcMocks.calls).toContainEqual([
        "remaining-page",
        { page: 2, limit: 100 },
      ]);
    });
  });
});
