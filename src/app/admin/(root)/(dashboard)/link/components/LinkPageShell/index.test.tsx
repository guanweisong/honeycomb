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

import { Permission } from "@/packages/identity/auth/permissions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

let allowedPermissions = new Set<Permission>();
const link = {
  id: "link-1",
  name: "OpenAI",
  url: "https://openai.com",
  logo: "https://openai.com/logo.png",
  description: null,
  status: "ENABLE",
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: null,
};
const trpcMocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("@/app/admin/hooks/use-current-user", () => ({
  useCan: (permission: Permission) => allowedPermissions.has(permission),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
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

import { LinkPageShell } from "./index";

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

    const checkboxes = container.querySelectorAll<HTMLElement>(
      '[role="checkbox"]',
    );
    expect(checkboxes).toHaveLength(2);
    await act(async () => checkboxes[1].click());
    expect((batchButton as HTMLButtonElement).disabled).toBe(false);
  });

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
