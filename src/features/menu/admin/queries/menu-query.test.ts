import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  calls: [] as Array<[string, unknown]>,
  refetch: vi.fn(),
  remainingPages: [] as Array<{ data: { list: string[] }; isLoading: boolean }>,
  pageTotal: undefined as number | undefined,
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    useQueries: (
      build: (query: {
        page: {
          adminIndex: (input: { page: number; limit: number }) => unknown;
        };
      }) => unknown[],
    ) => {
      const requests = build({
        page: {
          adminIndex: (input) => {
            trpcMocks.calls.push(["remaining-page", input]);
            return input;
          },
        },
      });
      return requests.map((_, index) => trpcMocks.remainingPages[index]);
    },
    page: {
      adminIndex: {
        useQuery: (input: unknown) => {
          trpcMocks.calls.push(["page", input]);
          return {
            data: {
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
          return { data: { list: ["category"] } };
        },
      },
    },
    menu: {
      adminIndex: {
        useQuery: (input: unknown) => {
          trpcMocks.calls.push(["menu", input]);
          return { data: { list: ["menu"] }, refetch: trpcMocks.refetch };
        },
      },
    },
  },
}));

import { getMenuQueryInputs, useMenuQuery } from "./menu-query";

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
      trpcMocks.remainingPages = [];
      trpcMocks.pageTotal = undefined;
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
      expect(query).toEqual({
        pageList: { list: ["page"] },
        categoryList: { list: ["category"] },
        checkedData: { list: ["menu"] },
        pageLoading: false,
        refetchMenu: trpcMocks.refetch,
      });
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
