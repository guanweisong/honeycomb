import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  refetch: vi.fn().mockResolvedValue(undefined),
  success: vi.fn(),
  setModalProps: vi.fn(),
  formSubmit: undefined as ((values: Record<string, unknown>) => Promise<void>) | undefined,
  categoryQuery: {
    data: { list: [] as Array<Record<string, unknown>> },
    refetch: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("sonner", () => ({ toast: { success: mocks.success } }));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    category: {
      adminIndex: { useQuery: () => mocks.categoryQuery },
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
    },
  },
}));
vi.mock("@/packages/ui/extended/Dialog", () => ({
  Dialog: (props: { children: React.ReactNode }) => <div>{props.children}</div>,
}));
vi.mock("@/packages/ui/extended/DynamicForm", () => ({
  DynamicForm: (props: { onSubmit: (values: Record<string, unknown>) => Promise<void> }) => {
    mocks.formSubmit = props.onSubmit;
    return <div>dynamic-form</div>;
  },
}));

import { ModalType } from "@/app/admin/types/modal-type";
import AddCategoryModal from ".";

describe("AddCategoryModal", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.create.mockReset().mockResolvedValue(undefined);
    mocks.update.mockReset().mockResolvedValue(undefined);
    mocks.categoryQuery.refetch.mockClear();
    mocks.success.mockClear();
    mocks.setModalProps.mockClear();
    mocks.formSubmit = undefined;
  });

  function render(modalProps: Record<string, unknown>) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <AddCategoryModal
          modalProps={modalProps as never}
          setModalProps={mocks.setModalProps}
        />,
      ),
    );
  }

  it("creates a category, removes the root parent sentinel, and closes", async () => {
    render({ type: ModalType.ADD, open: true });
    const values = { title: { zh: "分类" }, parent: "0" };

    await act(async () => mocks.formSubmit?.(values));

    expect(mocks.create).toHaveBeenCalledWith({ title: { zh: "分类" } });
    expect(mocks.categoryQuery.refetch).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledWith("添加成功");
    expect(mocks.setModalProps).toHaveBeenCalledWith({ open: false });
  });

  it("updates an existing category with its record id", async () => {
    render({
      type: ModalType.EDIT,
      open: true,
      record: { id: "category-1", title: { zh: "旧分类" } },
    });
    const values = { title: { zh: "新分类" }, parent: "parent-1" };

    await act(async () => mocks.formSubmit?.(values));

    expect(mocks.update).toHaveBeenCalledWith({
      ...values,
      id: "category-1",
    });
    expect(mocks.success).toHaveBeenCalledWith("更新成功");
    expect(mocks.setModalProps).toHaveBeenCalledWith({ open: false });
  });
});
