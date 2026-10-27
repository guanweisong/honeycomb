import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CategoryListItem as CategoryViewModel } from "@/features/category/types/category.record";
import { EnableStatus } from "@/lib/validation/enable-status";

const mocks = vi.hoisted(() => ({
  categories: [] as CategoryViewModel[],
  allowActions: true,
  destroy: vi.fn(),
  refetch: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => mocks.allowActions,
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error, warning: mocks.warning },
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    category: {
      adminTree: {
        useQuery: () => ({
          data: { list: mocks.categories, total: mocks.categories.length },
          isFetching: false,
          isError: false,
          refetch: mocks.refetch,
        }),
      },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
      create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
  },
}));

import Category from "@/features/category/admin/page";

describe("category bulk deletion from the complete tree", () => {
  let container: HTMLDivElement;
  let root: Root;

  function categories(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      id: (index + 1).toString(16).padStart(24, "0"),
      title: null,
      description: null,
      parent: null,
      path: `category-${index + 1}`,
      status: EnableStatus.ENABLE,
      createdAt: null,
      updatedAt: null,
      deepPath: 0,
    }));
  }

  beforeEach(() => {
    mocks.allowActions = true;
    mocks.categories = categories(3);
    mocks.destroy.mockReset().mockImplementation(async () => {
      return { success: true };
    });
    mocks.refetch.mockReset().mockResolvedValue(undefined);
    mocks.success.mockReset();
    mocks.warning.mockReset();
    mocks.error.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Category />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  function checkbox(selector: string) {
    const element = container.querySelector<HTMLButtonElement>(selector);
    if (!element) throw new Error(`Missing checkbox: ${selector}`);
    return element;
  }
  function button(text: string, parent: ParentNode = document) {
    const element = Array.from(parent.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === text,
    );
    if (!element) throw new Error(`Missing button: ${text}`);
    return element;
  }
  function checkedRows() {
    return container.querySelectorAll(
      'tbody [role="checkbox"][aria-checked="true"]',
    );
  }
  async function selectAll() {
    await act(async () => checkbox('thead [role="checkbox"]').click());
  }

  it("names row actions and keeps them hidden without mutation permission", async () => {
    expect(
      container.querySelectorAll('button[aria-label="编辑分类"]'),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll('button[aria-label="删除分类"]'),
    ).toHaveLength(3);
    mocks.allowActions = false;
    act(() => root.render(<Category />));
    expect(container.querySelector('button[aria-label="编辑分类"]')).toBeNull();
    expect(container.querySelector('button[aria-label="删除分类"]')).toBeNull();
  });

  it("selects and deletes the complete tree in one request without cap copy", async () => {
    mocks.categories = categories(105);
    act(() => root.render(<Category />));
    expect(container.textContent).not.toContain("已选择");
    expect(container.textContent).not.toContain("最多");
    expect(container.textContent).not.toContain("全选将");
    await selectAll();
    expect(checkedRows()).toHaveLength(105);
    await act(async () =>
      checkbox('tbody tr:first-child [role="checkbox"]').click(),
    );
    expect(checkedRows()).toHaveLength(104);
    expect(checkbox('tbody tr:first-child [role="checkbox"]').disabled).toBe(
      false,
    );
    await act(async () =>
      checkbox('tbody tr:first-child [role="checkbox"]').click(),
    );
    expect(checkedRows()).toHaveLength(105);
    await act(async () => button("批量删除", container).click());
    await act(async () => button("确定").click());
    expect(mocks.destroy).toHaveBeenCalledExactlyOnceWith({
      ids: [
        ...mocks.categories.slice(1).map(({ id }) => id),
        mocks.categories[0]?.id,
      ],
    });
    expect(checkedRows()).toHaveLength(0);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("retains the selected batch and confirmation dialog when deletion fails", async () => {
    mocks.destroy.mockRejectedValueOnce(new Error("category still has posts"));
    await selectAll();
    await act(async () => button("批量删除", container).click());
    await act(async () => button("确定").click());

    expect(checkedRows()).toHaveLength(3);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(mocks.error).toHaveBeenCalledWith("删除失败");
    expect(mocks.refetch).not.toHaveBeenCalled();

    await act(async () => button("确定").click());
    expect(mocks.destroy.mock.calls[1]?.[0]).toEqual(
      mocks.destroy.mock.calls[0]?.[0],
    );
    expect(checkedRows()).toHaveLength(0);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("allows deselecting the complete select-all selection", async () => {
    await selectAll();
    await selectAll();
    expect(checkedRows()).toHaveLength(0);
    expect(button("批量删除", container).disabled).toBe(true);
  });
  it.each(["completed", "degraded"])(
    "clears deleted selection after %s synchronization despite a failed refresh",
    async (publicSync) => {
      mocks.destroy.mockResolvedValue({ success: true, publicSync });
      mocks.refetch.mockRejectedValue(new Error("refresh failed"));
      await selectAll();
      await act(async () => button("批量删除", container).click());
      await act(async () => button("确定").click());
      expect(checkedRows()).toHaveLength(0);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(mocks.error).not.toHaveBeenCalled();
      if (publicSync === "degraded") {
        expect(mocks.warning).toHaveBeenCalledExactlyOnceWith(
          "已保存，公开内容同步未完成，请稍后检查公开页面",
        );
        expect(mocks.success).not.toHaveBeenCalled();
      } else {
        expect(mocks.success).toHaveBeenCalledExactlyOnceWith("删除成功");
        expect(mocks.warning).not.toHaveBeenCalled();
      }
    },
  );
});
