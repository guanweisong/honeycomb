import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  calls: [] as Array<[string, unknown]>,
  refetch: vi.fn(),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    page: {
      adminIndex: {
        useQuery: (input: unknown) => {
          trpcMocks.calls.push(["page", input]);
          return { data: { list: ["page"] } };
        },
      },
    },
    category: {
      adminIndex: {
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

import { getMenuQueryInputs, useMenuQuery } from "./menuQuery";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("menu query inputs", () => {
  it("preserves the collection limits and unfiltered admin menu input", () => {
    expect(getMenuQueryInputs()).toEqual({
      page: { limit: 9999 },
      category: { limit: 9999 },
      menu: undefined,
    });
  });

  describe("hook", () => {
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

    it("binds each input and returns the matching query result", async () => {
      let query: ReturnType<typeof useMenuQuery> | undefined;
      function Harness() {
        query = useMenuQuery();
        return null;
      }

      await act(async () => root.render(React.createElement(Harness)));

      expect(trpcMocks.calls).toEqual([
        ["page", { limit: 9999 }],
        ["category", { limit: 9999 }],
        ["menu", undefined],
      ]);
      expect(query).toEqual({
        pageList: { list: ["page"] },
        categoryList: { list: ["category"] },
        checkedData: { list: ["menu"] },
        refetchMenu: trpcMocks.refetch,
      });
    });
  });
});
