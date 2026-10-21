import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FieldConfig } from "@/components/DynamicForm/types";
import type { CategoryListItem } from "@/features/category/types";
import { EnableStatus } from "@/lib/validation/enable-status";

const mocks = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  refetch: vi.fn().mockResolvedValue(undefined),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setModalProps: vi.fn(),
  formSubmit: undefined as
    ((values: Record<string, unknown>) => Promise<void>) | undefined,
  categoryQuery: {
    data: { list: [] } as { list: CategoryListItem[] } | undefined,
    refetch: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, warning: mocks.warning, error: mocks.error },
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    category: {
      adminTree: { useQuery: () => mocks.categoryQuery },
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
    },
  },
}));
vi.mock("@/components/Dialog", () => ({
  Dialog: (props: { children: React.ReactNode }) => <div>{props.children}</div>,
}));
vi.mock("@/components/DynamicForm", () => ({
  DynamicForm: (props: {
    onSubmit: (values: Record<string, unknown>) => Promise<void>;
    fields: FieldConfig[];
  }) => {
    mocks.formSubmit = props.onSubmit;
    const options = props.fields.find(
      (field) => field.name === "parent",
    )?.options;
    return (
      <div>
        dynamic-form
        {Array.isArray(options) &&
          options.map((option) => (
            <span key={option.value}>{option.label}</span>
          ))}
      </div>
    );
  },
}));

import { ModalType } from "@/components/admin/modal-type";
import CategoryFormDialog, { type ModalProps } from ".";

describe("CategoryFormDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.create.mockReset().mockResolvedValue(undefined);
    mocks.update.mockReset().mockResolvedValue(undefined);
    mocks.categoryQuery.refetch.mockReset().mockResolvedValue(undefined);
    mocks.warning.mockClear();
    mocks.error.mockClear();
    mocks.success.mockClear();
    mocks.setModalProps.mockClear();
    mocks.formSubmit = undefined;
    mocks.categoryQuery.data = { list: [] };
  });

  function render(modalProps: ModalProps) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <CategoryFormDialog
          modalProps={modalProps}
          setModalProps={mocks.setModalProps}
        />,
      ),
    );
  }

  it("does not retain stale parent choices when query data becomes unavailable", () => {
    mocks.categoryQuery.data = {
      list: [
        {
          id: "category-1",
          title: { zh: "旧父级", en: "Old parent" },
          description: null,
          path: "old-parent",
          parent: null,
          status: EnableStatus.ENABLE,
          createdAt: null,
          updatedAt: null,
          deepPath: 0,
        },
      ],
    };
    render({ type: ModalType.ADD, open: true });
    expect(container.textContent).toContain("旧父级");
    mocks.categoryQuery.data = undefined;
    act(() =>
      root.render(
        <CategoryFormDialog
          modalProps={{ type: ModalType.ADD, open: true }}
          setModalProps={mocks.setModalProps}
        />,
      ),
    );
    expect(container.textContent).not.toContain("旧父级");
    expect(container.textContent).toContain("根分类");
  });

  it("creates a category, removes the root parent sentinel, and closes", async () => {
    render({ type: ModalType.ADD, open: true });
    const values = {
      title: { zh: "分类", en: "English" },
      description: { zh: "说明", en: "Description" },
      path: "category",
      parent: "0",
    };

    await act(async () => mocks.formSubmit?.(values));

    expect(mocks.create).toHaveBeenCalledWith({
      title: { zh: "分类", en: "English" },
      description: { zh: "说明", en: "Description" },
      path: "category",
    });
    expect(mocks.categoryQuery.refetch).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledWith("添加成功");
    expect(mocks.setModalProps).toHaveBeenCalledWith({ open: false });
  });

  it("updates an existing category with its record id", async () => {
    render({
      type: ModalType.EDIT,
      open: true,
      record: {
        id: "507f1f77bcf86cd799439011",
        title: { zh: "旧分类", en: "English" },
        description: null,
        path: "category",
        parent: null,
        status: EnableStatus.ENABLE,
        createdAt: null,
        updatedAt: null,
        deepPath: 0,
      },
    });
    const values = {
      title: { zh: "新分类", en: "English" },
      parent: "parent-1",
    };

    await act(async () => mocks.formSubmit?.(values));

    expect(mocks.update).toHaveBeenCalledWith({
      ...values,
      id: "507f1f77bcf86cd799439011",
    });
    expect(mocks.success).toHaveBeenCalledWith("更新成功");
    expect(mocks.setModalProps).toHaveBeenCalledWith({ open: false });
  });

  it.each([ModalType.ADD, ModalType.EDIT])(
    "warns once and closes after degraded %s even when refresh rejects",
    async (type) => {
      const mutation = type === ModalType.ADD ? mocks.create : mocks.update;
      mutation.mockResolvedValue({ publicSync: "degraded" });
      mocks.categoryQuery.refetch.mockRejectedValue(
        new Error("refresh failed"),
      );
      render({
        type,
        open: true,
        record: {
          id: "507f1f77bcf86cd799439011",
          title: { zh: "旧分类", en: "English" },
          description: null,
          path: "category",
          parent: null,
          status: EnableStatus.ENABLE,
          createdAt: null,
          updatedAt: null,
          deepPath: 0,
        },
      });
      await act(async () =>
        mocks.formSubmit?.({
          title: { zh: "分类", en: "Category" },
          description: { zh: "说明", en: "Description" },
          path: "category",
        }),
      );
      expect(mocks.warning).toHaveBeenCalledExactlyOnceWith(
        "已保存，公开内容同步未完成，请稍后检查公开页面",
      );
      expect(mocks.success).not.toHaveBeenCalled();
      expect(mocks.error).not.toHaveBeenCalled();
      expect(mocks.setModalProps).toHaveBeenCalledWith({ open: false });
    },
  );

  it("keeps the category dialog open after a failed write", async () => {
    mocks.create.mockRejectedValue(new Error("write failed"));
    render({ type: ModalType.ADD, open: true });
    await act(async () =>
      mocks.formSubmit?.({
        title: { zh: "分类", en: "Category" },
        description: { zh: "说明", en: "Description" },
        path: "category",
      }),
    );
    expect(mocks.setModalProps).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("添加失败");
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.warning).not.toHaveBeenCalled();
  });
});
