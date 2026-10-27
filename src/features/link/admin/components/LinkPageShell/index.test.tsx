import type { LinkRecord } from "@/features/link/types/link.record";
import { EnableStatus } from "@/lib/validation/enable-status";
import { requireDefined } from "@tests/helpers/require-defined";
import React, { act } from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createRoot, type Root } from "react-dom/client";

import { Permission } from "@/lib/auth/permissions";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

let allowedPermissions = new Set<Permission>();
const link: LinkRecord = {
  id: "link-1",
  name: "OpenAI",
  url: "https://openai.com",
  logo: "https://openai.com/logo.png",
  description: null,
  status: EnableStatus.ENABLE,
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: null,
};
const trpcMocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: (permission: Permission) => allowedPermissions.has(permission),
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    link: {
      adminIndex: {
        useQuery: () => ({
          data: { list: [link], total: 1 },
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

import { LinkPageShell } from "@/features/link/admin/components/LinkPageShell/index";

describe("LinkPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    allowedPermissions = new Set();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("names row actions and associates the search label", async () => {
    allowedPermissions = new Set([
      Permission.linkUpdate,
      Permission.linkDelete,
    ]);
    await act(async () => root.render(<LinkPageShell />));
    for (const name of ["编辑链接", "删除链接"]) {
      const button = container.querySelector(
        `tbody button[aria-label="${name}"]`,
      );
      expect(button).not.toBeNull();
      expect(button?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
        "true",
      );
    }
    const input = container.querySelector<HTMLInputElement>(
      'input[placeholder="请输入链接名称进行搜索"]',
    );
    const label = document.getElementById(
      input?.getAttribute("aria-labelledby") ?? "",
    );
    expect(label?.textContent).toBe("搜索链接");
    if (input) input.value = "test";
    expect(label?.textContent).toBe("搜索链接");
  });

  it("keeps search copy while hiding link management controls", async () => {
    await act(async () => root.render(React.createElement(LinkPageShell)));

    expect(container.textContent).toContain("查询");
    expect(
      container.querySelector('input[placeholder="请输入链接名称进行搜索"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("添加链接");
    expect(container.textContent).not.toContain("批量删除");
    expect(container.textContent).not.toContain("操作");
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(0);
  });

  it("uses delete permission for selection and batch-delete state", async () => {
    allowedPermissions = new Set([Permission.linkDelete]);
    await act(async () => root.render(React.createElement(LinkPageShell)));

    const batchButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("批量删除"),
    );
    expect(batchButton).toBeDefined();
    expect((batchButton as HTMLButtonElement).disabled).toBe(true);

    const checkboxes =
      container.querySelectorAll<HTMLElement>('[role="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    await act(async () => requireDefined(checkboxes[1]).click());
    expect((batchButton as HTMLButtonElement).disabled).toBe(false);
  });

  it.each(["batch", "single"])(
    "retains the real %s delete dialog and selection after failure, then closes after committed retry",
    async (mode) => {
      allowedPermissions = new Set([Permission.linkDelete]);
      trpcMocks.mutateAsync
        .mockReset()
        .mockRejectedValueOnce(new Error("write failed"))
        .mockResolvedValueOnce({ success: true, publicSync: "degraded" });
      trpcMocks.refetch
        .mockReset()
        .mockRejectedValue(new Error("refresh failed"));
      await act(async () => root.render(<LinkPageShell />));
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
        [{ ids: ["link-1"] }],
        [{ ids: ["link-1"] }],
      ]);
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      if (mode === "batch") expect(batch.disabled).toBe(true);
    },
  );

  it("opens the existing add-link form for create permission", async () => {
    allowedPermissions = new Set([Permission.linkCreate]);
    await act(async () => root.render(React.createElement(LinkPageShell)));

    const addButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("添加链接"),
    );
    expect(addButton).toBeDefined();
    await act(async () => addButton?.click());

    expect(document.body.textContent).toContain("添加链接");
    expect(
      document.body.querySelector('input[placeholder="请输入链接名称"]'),
    ).not.toBeNull();
    expect(
      document.body.querySelector(
        'input[placeholder="请以http://或者https://开头"]',
      ),
    ).not.toBeNull();
  });
});
