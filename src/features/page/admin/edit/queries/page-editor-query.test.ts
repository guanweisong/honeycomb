import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  calls: [] as unknown[],
  refetch: vi.fn(),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    page: {
      adminDetail: {
        useQuery: (input: unknown, options: unknown) => {
          trpcMocks.calls.push([input, options]);
          return { data: { id: "page-42" }, refetch: trpcMocks.refetch };
        },
      },
    },
  },
}));

import { getPageEditorQueryInput, usePageEditorQuery } from "./page-editor-query";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("page editor query", () => {
  it("keeps the admin detail input shape for create and edit routes", () => {
    expect(getPageEditorQueryInput(null)).toEqual({ id: null });
    expect(getPageEditorQueryInput("page-42")).toEqual({ id: "page-42" });
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

    it.each([
      [null, false],
      ["page-42", true],
    ])("binds id %s with enabled=%s", async (id, enabled) => {
      let query: ReturnType<typeof usePageEditorQuery> | undefined;
      function Harness() {
        query = usePageEditorQuery(id);
        return null;
      }

      await act(async () => root.render(React.createElement(Harness)));
      expect(trpcMocks.calls.at(-1)).toEqual([{ id }, { enabled }]);
      expect(query).toEqual({
        data: { id: "page-42" },
        refetch: trpcMocks.refetch,
      });
    });
  });
});
