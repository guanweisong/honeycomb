import { requireDefined } from "@tests/helpers/require-defined";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import type { UserRecord } from "@/features/user/types/user.record";
import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const user: UserRecord = {
  id: "user-1",
  name: "Editor",
  email: "editor@example.test",
  level: UserLevel.EDITOR,
  status: UserStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
};
let canManageUsers = false;
const trpcMocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("@/app/admin/(dashboard)/providers/use-current-user", () => ({
  useCan: () => canManageUsers,
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    user: {
      index: {
        useQuery: () => ({
          data: { list: [user], total: 1 },
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

import { UserPageShell } from "@/app/admin/(dashboard)/user/components/UserPageShell/index";

describe("UserPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    canManageUsers = false;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it.each(["batch", "single"])(
    "retains the real %s delete dialog and selection after failure, then closes after committed retry",
    async (mode) => {
      canManageUsers = true;
      trpcMocks.mutateAsync
        .mockReset()
        .mockRejectedValueOnce(new Error("write failed"))
        .mockResolvedValueOnce({ success: true, publicSync: "degraded" });
      trpcMocks.refetch
        .mockReset()
        .mockRejectedValue(new Error("refresh failed"));
      await act(async () => root.render(<UserPageShell />));
      await act(async () =>
        requireDefined(
          container.querySelectorAll<HTMLElement>('[role="checkbox"]')[1],
        ).click(),
      );
      const batch = requireDefined(
        Array.from(container.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("批量删除"),
        ),
      );
      const trigger =
        mode === "batch"
          ? batch
          : requireDefined(
              Array.from(
                container.querySelectorAll<HTMLButtonElement>("tbody button"),
              ).at(-1),
            );
      await act(async () => trigger.click());
      const confirm = () =>
        requireDefined(
          Array.from(document.body.querySelectorAll("button")).find(
            (button) => button.textContent === "确定",
          ),
        );
      await act(async () => confirm().click());
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
      expect(batch.disabled).toBe(false);
      await act(async () => confirm().click());
      expect(trpcMocks.mutateAsync.mock.calls).toEqual([
        [{ ids: ["user-1"] }],
        [{ ids: ["user-1"] }],
      ]);
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      if (mode === "batch") expect(batch.disabled).toBe(true);
    },
  );

  it("names row actions and associates the search label", async () => {
    canManageUsers = true;
    await act(async () => root.render(<UserPageShell />));
    for (const name of ["编辑用户", "删除用户"]) {
      const button = container.querySelector(
        `tbody button[aria-label="${name}"]`,
      );
      expect(button).not.toBeNull();
      expect(button?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
        "true",
      );
    }
    const input = container.querySelector<HTMLInputElement>(
      'input[placeholder="请输入用户名进行搜索"]',
    );
    const label = document.getElementById(
      input?.getAttribute("aria-labelledby") ?? "",
    );
    expect(label?.textContent).toBe("搜索用户");
    if (input) input.value = "test";
    expect(label?.textContent).toBe("搜索用户");
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
