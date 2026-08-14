import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

let canUpdateMenu = false;
const queryMocks = vi.hoisted(() => ({
  data: { list: [] },
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("@/app/admin/hooks/use-current-user", () => ({
  useCan: () => canUpdateMenu,
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    page: {
      adminIndex: { useQuery: () => ({ data: queryMocks.data }) },
    },
    category: {
      adminIndex: { useQuery: () => ({ data: queryMocks.data }) },
    },
    menu: {
      adminIndex: {
        useQuery: () => ({
          data: queryMocks.data,
          refetch: queryMocks.refetch,
        }),
      },
      saveAll: {
        useMutation: () => ({ mutateAsync: queryMocks.mutateAsync }),
      },
    },
  },
}));

vi.mock("@nosferatu500/react-sortable-tree", async () => {
  const actual = await vi.importActual<
    typeof import("@nosferatu500/react-sortable-tree")
  >("@nosferatu500/react-sortable-tree");
  return { ...actual, default: () => null };
});

import { MenuPageShell } from "./index";

describe("MenuPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    canUpdateMenu = false;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps the menu copy and hides save without update permission", async () => {
    await act(async () => root.render(React.createElement(MenuPageShell)));

    expect(container.textContent).toContain("可选菜单项");
    expect(container.textContent).toContain("勾选菜单项添加到右侧");
    expect(container.textContent).toContain("菜单结构");
    expect(container.textContent).toContain("请先从左侧选择菜单");
    expect(container.textContent).not.toContain("保存");
  });

  it("shows save when update permission is granted", async () => {
    canUpdateMenu = true;
    await act(async () => root.render(React.createElement(MenuPageShell)));

    expect(container.textContent).toContain("保存");
  });
});
