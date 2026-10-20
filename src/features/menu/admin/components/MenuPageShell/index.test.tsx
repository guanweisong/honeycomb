import { MenuType } from "@/features/menu/menu-types";
import React, { act, type CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import type { MenuEntityTree, SortableMenuNode } from "../../menu-transforms";

let canUpdateMenu = false;
const queryMocks = vi.hoisted(
  (): {
    data: { list: MenuEntityTree[] };
    refetch: ReturnType<typeof vi.fn>;
    mutateAsync: ReturnType<typeof vi.fn>;
  } => ({
    data: { list: [] },
    refetch: vi.fn(),
    mutateAsync: vi.fn(),
  }),
);

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => canUpdateMenu,
  useCurrentUser: () => ({ user: { id: "actor" } }),
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useQueries: () => [],
    page: {
      adminIndex: { useQuery: () => ({ data: queryMocks.data }) },
    },
    category: {
      adminTree: { useQuery: () => ({ data: queryMocks.data }) },
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
  return {
    ...actual,
    default: () => null,
    SortableTree: ({
      "aria-label": ariaLabel,
      className,
      style,
      treeData,
      generateNodeProps,
    }: {
      "aria-label"?: string;
      className?: string;
      style?: CSSProperties;
      treeData: SortableMenuNode[];
      generateNodeProps?: (input: { node: SortableMenuNode }) => {
        buttons: React.ReactNode[];
      };
    }) =>
      React.createElement(
        "div",
        {
          "aria-label": ariaLabel,
          className,
          role: "tree",
          style,
        },
        treeData.map((node) =>
          React.createElement(
            "div",
            { key: node.id },
            generateNodeProps?.({ node }).buttons,
          ),
        ),
      ),
  };
});

import { MenuPageShell } from "./index";

describe("MenuPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    canUpdateMenu = false;
    queryMocks.data = { list: [] };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("offers explicit removal for a category whose target was deleted", async () => {
    canUpdateMenu = true;
    queryMocks.data = {
      list: [
        {
          id: "orphan-row-uuid",
          type: MenuType.CATEGORY,
          parent: null,
          power: 0,
          title: null,
          createdAt: null,
          updatedAt: null,
        },
      ],
    };
    await act(async () => root.render(React.createElement(MenuPageShell)));
    const remove = container.querySelector<HTMLButtonElement>(
      'button[aria-label^="移除此菜单及子项"]',
    );
    expect(remove).not.toBeNull();
    await act(async () => remove?.click());
    expect(
      container.querySelector('button[aria-label^="移除此菜单及子项"]'),
    ).toBeNull();
    expect(container.textContent).toContain("请先从左侧选择菜单");
  });

  it("keeps the menu copy and hides save without update permission", async () => {
    await act(async () => root.render(React.createElement(MenuPageShell)));

    expect(container.textContent).toContain("可选菜单项");
    expect(container.textContent).toContain("勾选菜单项添加到右侧");
    expect(container.textContent).toContain("菜单结构");
    expect(container.textContent).toContain("请先从左侧选择菜单");
    expect(container.querySelector("button")?.textContent).not.toBe("保存");
  });

  it("shows save when update permission is granted", async () => {
    canUpdateMenu = true;
    await act(async () => root.render(React.createElement(MenuPageShell)));

    expect(container.textContent).toContain("保存");
  });

  it("gives the virtualized menu tree a visible height and accessible name", async () => {
    queryMocks.data = {
      list: [
        {
          id: "parent",
          parent: null,
          power: 0,
          type: MenuType.CATEGORY,
          createdAt: null,
          updatedAt: null,
          title: { zh: "父菜单" },
        },
        {
          id: "child",
          parent: "parent",
          power: 1,
          type: MenuType.PAGE,
          createdAt: null,
          updatedAt: null,
          title: { zh: "子菜单" },
        },
      ],
    };

    await act(async () => root.render(React.createElement(MenuPageShell)));

    const tree = container.querySelector<HTMLElement>('[role="tree"]');
    expect(tree?.getAttribute("aria-label")).toBe("菜单结构");
    expect(tree?.classList.contains("menu-tree")).toBe(true);
    expect(tree?.style.height).toBe("100px");
  });
});
