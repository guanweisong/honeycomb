import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  input: undefined as unknown,
  refetch: vi.fn(),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    media: {
      index: {
        useQuery: (input: unknown) => {
          trpcMocks.input = input;
          return { data: { list: ["media"] }, refetch: trpcMocks.refetch };
        },
      },
    },
  },
}));

import { getMediaQueryInput, useMediaQuery } from "./mediaQuery";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("media query input", () => {
  it("preserves the unpaged media index input", () => {
    expect(getMediaQueryInput()).toEqual({ limit: 99999 });
  });

  describe("hook", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
      trpcMocks.input = undefined;
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    });

    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
    });

    it("uses the unpaged input and forwards data and refetch", async () => {
      let query: ReturnType<typeof useMediaQuery> | undefined;
      function Harness() {
        query = useMediaQuery();
        return null;
      }

      await act(async () => root.render(React.createElement(Harness)));
      expect(trpcMocks.input).toEqual({ limit: 99999 });
      expect(query).toEqual({
        data: { list: ["media"] },
        refetch: trpcMocks.refetch,
      });
    });
  });
});
