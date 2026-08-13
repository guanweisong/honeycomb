import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, refetch: vi.fn() })),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: { user: { current: { useQuery: mocks.useQuery } } },
}));

import { useCurrentUser } from "./useCurrentUser";

function Probe() {
  useCurrentUser();
  return null;
}

describe("useCurrentUser", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    mocks.useQuery.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps the current user briefly fresh after server hydration", async () => {
    await act(async () => root.render(React.createElement(Probe)));

    expect(mocks.useQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({
      staleTime: 30_000,
    }));
  });
});
