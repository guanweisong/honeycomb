import React, { act } from "react";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, refetch: vi.fn() })),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: { user: { current: { useQuery: mocks.useQuery } } },
}));

import {
  CurrentUserProvider,
  useCan,
  useCurrentUser,
} from "./use-current-user";

function Probe() {
  useCurrentUser();
  return null;
}

function PermissionProbe() {
  useCan("post:create");
  useCan("post:update");
  return null;
}

describe("use-current-user", () => {
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
    await act(async () =>
      root.render(
        React.createElement(
          CurrentUserProvider,
          {
            initialUser: {
              id: "user-1",
              level: UserLevel.ADMIN,
              email: null,
              name: null,
              status: UserStatus.ENABLE,
            },
          },
          React.createElement(Probe),
        ),
      ),
    );

    expect(mocks.useQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({
      staleTime: 30_000,
    }));
  });

  it("shares one current-user query across permission consumers", async () => {
    await act(async () =>
      root.render(
        React.createElement(
          CurrentUserProvider,
          {
            initialUser: {
              id: "user-1",
              level: UserLevel.ADMIN,
              email: null,
              name: null,
              status: UserStatus.ENABLE,
            },
          },
          React.createElement(PermissionProbe),
        ),
      ),
    );

    expect(mocks.useQuery).toHaveBeenCalledTimes(1);
  });
});
