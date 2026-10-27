import { MenuType } from "@/features/menu/types/menu.type";
import React, { act, type CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import type { MenuEntityTree, SortableMenuNode } from "@/features/menu/admin/menu-transforms";

let canUpdateMenu = false;
const queryMocks = vi.hoisted(
  (): {
    data: { list: MenuEntityTree[]; version?: number };
    menuUnavailable: boolean;
    menuError: boolean;
    categoryError: boolean;
    pageError: boolean;
    retryCategory: ReturnType<typeof vi.fn>;
    retryPage: ReturnType<typeof vi.fn>;
    menuFetching: boolean;
    refetch: ReturnType<typeof vi.fn>;
    mutateAsync: ReturnType<typeof vi.fn>;
  } => ({
    data: { list: [], version: 0 },
    menuUnavailable: false,
    menuError: false,
    categoryError: false,
    pageError: false,
    retryCategory: vi.fn(),
    retryPage: vi.fn(),
    menuFetching: false,
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
      menuOptions: {
        useQuery: () => ({
          data: queryMocks.data,
          isError: queryMocks.pageError,
          refetch: queryMocks.retryPage,
        }),
      },
    },
    category: {
      adminTree: {
        useQuery: () => ({
          data: queryMocks.data,
          isError: queryMocks.categoryError,
          refetch: queryMocks.retryCategory,
        }),
      },
    },
    menu: {
      adminIndex: {
        useQuery: () => ({
          data: queryMocks.menuUnavailable ? undefined : queryMocks.data,
          isError: queryMocks.menuError,
          isFetching: queryMocks.menuFetching,
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
      canDrag,
    }: {
      "aria-label"?: string;
      className?: string;
      style?: CSSProperties;
      treeData: SortableMenuNode[];
      canDrag?: boolean;
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
          "data-draggable": String(canDrag),
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

import { MenuPageShell } from "@/features/menu/admin/components/MenuPageShell/index";

describe("MenuPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    canUpdateMenu = false;
    queryMocks.data = { list: [], version: 0 };
    queryMocks.menuUnavailable = false;
    queryMocks.menuError = false;
    queryMocks.categoryError = false;
    queryMocks.pageError = false;
    queryMocks.retryCategory.mockReset();
    queryMocks.retryPage.mockReset();
    queryMocks.menuFetching = false;
    queryMocks.refetch.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("offers independent option retries without replacing dirty menu edits", async () => {
    canUpdateMenu = true;
    queryMocks.data = {
      version: 4,
      list: [
        {
          id: "choice",
          type: MenuType.CATEGORY,
          parent: null,
          power: 0,
          title: { zh: "分类" },
          createdAt: null,
          updatedAt: null,
        },
      ],
    };
    await act(async () => root.render(<MenuPageShell />));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label^="移除此菜单及子项"]')
        ?.click(),
    );
    expect(container.querySelector('[role="tree"]')?.textContent).toBe("");
    queryMocks.categoryError = true;
    queryMocks.pageError = true;
    await act(async () => root.render(<MenuPageShell />));
    const categoryRetry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "重试加载分类",
    );
    expect(categoryRetry).toBeDefined();
    await act(async () => categoryRetry?.click());
    expect(queryMocks.retryCategory).toHaveBeenCalledOnce();
    const pageTab = Array.from(container.querySelectorAll('[role="tab"]')).find(
      (tab) => tab.textContent === "页面",
    );
    await act(async () =>
      pageTab?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0 }),
      ),
    );
    expect(container.textContent).toContain("部分页面未加载");
    const pageRetry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "重试加载页面",
    );
    await act(async () => pageRetry?.click());
    expect(queryMocks.retryPage).toHaveBeenCalledOnce();
    expect(queryMocks.refetch).not.toHaveBeenCalled();
    expect(container.querySelector('[role="tree"]')?.textContent).toBe("");
    expect(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "保存",
      )?.disabled,
    ).toBe(false);
  });

  it("blocks initial edits and offers a retry until a menu version is loaded", async () => {
    canUpdateMenu = true;
    queryMocks.menuUnavailable = true;
    queryMocks.menuError = true;
    queryMocks.data = {
      version: 0,
      list: [
        {
          id: "choice",
          type: MenuType.CATEGORY,
          parent: null,
          power: 0,
          title: { zh: "可选分类" },
          createdAt: null,
          updatedAt: null,
        },
      ],
    };
    await act(async () => root.render(<MenuPageShell />));
    expect(
      container.querySelector<HTMLButtonElement>('[role="checkbox"]')?.disabled,
    ).toBe(true);
    expect(
      container.querySelector('[role="tree"]')?.getAttribute("data-draggable"),
    ).toBe("false");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "菜单读取失败",
    );
    const retry = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent === "重试加载菜单");
    expect(retry).toBeDefined();
    await act(async () => retry?.click());
    expect(queryMocks.refetch).toHaveBeenCalledOnce();
    queryMocks.menuFetching = true;
    await act(async () => root.render(<MenuPageShell />));
    expect(retry?.disabled).toBe(true);

    queryMocks.menuUnavailable = false;
    queryMocks.menuError = false;
    queryMocks.menuFetching = false;
    await act(async () => root.render(<MenuPageShell />));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(
      container.querySelector('[role="tree"]')?.getAttribute("data-draggable"),
    ).toBe("true");
    expect(
      container.querySelector('button[aria-label^="移除此菜单及子项"]'),
    ).not.toBeNull();
  });

  it("hides passive sync copy while keeping removal and dirty save gating", async () => {
    canUpdateMenu = true;
    queryMocks.data = {
      version: 0,
      list: [
        {
          id: "row",
          type: MenuType.CUSTOM,
          parent: null,
          power: 0,
          title: null,
          createdAt: null,
          updatedAt: null,
        },
      ],
    };
    await act(async () => root.render(<MenuPageShell />));
    const save = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent?.includes("保存"));
    expect(save?.disabled).toBe(true);
    expect(container.textContent).not.toMatch(/已与服务器同步|有未保存的更改/);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label^="移除此菜单及子项"]',
        )
        ?.click(),
    );
    expect(save?.disabled).toBe(false);
    expect(container.textContent).not.toMatch(/已与服务器同步|有未保存的更改/);
  });

  it("offers explicit removal for a category whose target was deleted", async () => {
    canUpdateMenu = true;
    queryMocks.data = {
      version: 0,
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
      version: 0,
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
