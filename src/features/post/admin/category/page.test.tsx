import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteBatchSchema } from "@/packages/trpc/api/schemas/delete.batch.schema";
import type { CategoryViewModel } from "@/features/category/presentation/category-view-model";

const mocks = vi.hoisted(() => ({
  categories: [] as CategoryViewModel[],
  destroy: vi.fn(),
  refetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/features/contracts/admin/use-current-user", () => ({
  useCan: () => true,
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
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

import Category from "./page";

describe("category bulk deletion from the complete tree", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.categories = Array.from({ length: 105 }, (_, index) => ({
      id: (index + 1).toString(16).padStart(24, "0"),
      title: null,
      description: null,
      parent: null,
      path: `category-${index + 1}`,
      status: "ENABLE",
      createdAt: null,
      updatedAt: null,
      deepPath: 0,
    }));
    mocks.destroy.mockReset().mockImplementation(async (input) => {
      DeleteBatchSchema.parse(input);
      return { success: true };
    });
    mocks.refetch.mockReset().mockResolvedValue(undefined);
    mocks.success.mockReset();
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

  it("caps select-all and individual selection to a valid shared deletion batch", async () => {
    expect(
      DeleteBatchSchema.safeParse({ ids: mocks.categories.map(({ id }) => id) })
        .success,
    ).toBe(false);
    await selectAll();
    expect(checkedRows()).toHaveLength(100);
    expect(container.textContent).toContain("每次最多选择并删除 100 个分类");
    expect(checkbox('tbody tr:last-child [role="checkbox"]').disabled).toBe(
      true,
    );

    await act(async () =>
      checkbox('tbody tr:first-child [role="checkbox"]').click(),
    );
    expect(checkedRows()).toHaveLength(99);
    await act(async () =>
      checkbox('tbody tr:last-child [role="checkbox"]').click(),
    );
    expect(checkedRows()).toHaveLength(100);
    await act(async () => button("批量删除", container).click());
    await act(async () => button("确定").click());

    const [input] = mocks.destroy.mock.calls[0] ?? [];
    expect(input?.ids).toHaveLength(100);
    expect(DeleteBatchSchema.safeParse(input).success).toBe(true);
    expect(checkedRows()).toHaveLength(0);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("retains the selected batch and confirmation dialog when deletion fails", async () => {
    mocks.destroy.mockRejectedValueOnce(new Error("category still has posts"));
    await selectAll();
    await act(async () => button("批量删除", container).click());
    await act(async () => button("确定").click());

    expect(checkedRows()).toHaveLength(100);
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

  it("allows deselecting the capped select-all selection", async () => {
    await selectAll();
    await selectAll();
    expect(checkedRows()).toHaveLength(0);
    expect(button("批量删除", container).disabled).toBe(true);
  });
});
