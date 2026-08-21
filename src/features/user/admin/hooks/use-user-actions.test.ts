import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserLevel } from "@/packages/domain/identity/user";
import { UserStatus } from "@/packages/domain/identity/user";
import type { UserViewModel as UserEntity } from "../../presentation/user-view-model";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  error: vi.fn(),
  refetch: vi.fn(),
  selection: vi.fn(),
  success: vi.fn(),
  update: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.error, success: mocks.success },
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    user: {
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
  },
}));

import { useUserActions } from "../actions/user-actions";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const users = [
  {
    id: "user-1",
    name: "One",
    level: UserLevel.EDITOR,
    status: UserStatus.ENABLE,
  },
  {
    id: "user-2",
    name: "Two",
    level: UserLevel.GUEST,
    status: UserStatus.ENABLE,
  },
] as UserEntity[];

function Harness() {
  const actions = useUserActions({
    selectedRows: users,
    onSelectionChange: mocks.selection,
    refetch: mocks.refetch,
  });
  return React.createElement(
    "button",
    { onClick: () => void actions.handleDeleteBatch() },
    "delete",
  );
}

describe("useUserActions selection", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.destroy.mockResolvedValue({ success: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("deletes the selected ids then clears the controlled selection", async () => {
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => container.querySelector("button")?.click());

    expect(mocks.destroy).toHaveBeenCalledWith({ ids: ["user-1", "user-2"] });
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.success).toHaveBeenCalledWith("删除成功");
    expect(mocks.selection).toHaveBeenCalledWith([]);
  });
});
