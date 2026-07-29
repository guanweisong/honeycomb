import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

let canManageUsers = false;
const trpcMocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("@/app/admin/hooks/useCurrentUser", () => ({
  useCan: () => canManageUsers,
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    user: {
      index: {
        useQuery: () => ({
          data: { list: [], total: 0 },
          isFetching: false,
          isError: false,
          refetch: trpcMocks.refetch,
        }),
      },
      create: {
        useMutation: () => ({ mutateAsync: trpcMocks.mutateAsync }),
      },
      update: {
        useMutation: () => ({ mutateAsync: trpcMocks.mutateAsync }),
      },
      destroy: {
        useMutation: () => ({ mutateAsync: trpcMocks.mutateAsync }),
      },
    },
  },
}));

import { UserPageShell } from "./UserPageShell";

describe("UserPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    canManageUsers = false;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps search copy while hiding user management controls", async () => {
    await act(async () => root.render(React.createElement(UserPageShell)));

    expect(container.textContent).toContain("查询");
    expect(
      container.querySelector('input[placeholder="请输入用户名进行搜索"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("添加新用户");
    expect(container.textContent).not.toContain("批量删除");
  });

  it("shows the existing management controls with userManage", async () => {
    canManageUsers = true;
    await act(async () => root.render(React.createElement(UserPageShell)));

    expect(container.textContent).toContain("添加新用户");
    expect(container.textContent).toContain("批量删除");
  });
});
