import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  success: vi.fn(),
  error: vi.fn(),
  formSubmit: undefined as ((values: Record<string, unknown>) => Promise<void>) | undefined,
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    tag: {
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
import AddTagDialog, { type AddTagDialogProps } from ".";

describe("AddTagDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.create.mockReset().mockResolvedValue(undefined);
    mocks.update.mockReset().mockResolvedValue(undefined);
    mocks.success.mockClear();
    mocks.error.mockClear();
    mocks.formSubmit = undefined;
  });

  function render(props: Record<string, unknown>) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(<AddTagDialog {...(props as unknown as AddTagDialogProps)} />),
    );
  }

  it("creates a tag and closes after success", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const values = { name: { zh: "标签" } };
    render({ type: ModalType.ADD, open: true, onClose, onSuccess });

    await act(async () => mocks.formSubmit?.(values));

    expect(mocks.create).toHaveBeenCalledWith(values);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledWith("添加成功");
  });

  it("updates an existing tag with its id", async () => {
    const values = { name: { zh: "更新标签" } };
    render({
      type: ModalType.EDIT,
      open: true,
      record: { id: "tag-1", name: { zh: "旧标签" } },
    });

    await act(async () => mocks.formSubmit?.(values));

    expect(mocks.update).toHaveBeenCalledWith({ ...values, id: "tag-1" });
    expect(mocks.success).toHaveBeenCalledWith("更新成功");
  });

  it("reports a failed create without closing the dialog", async () => {
    mocks.create.mockRejectedValueOnce(new Error("network error"));
    const onClose = vi.fn();
    render({ type: ModalType.ADD, open: true, onClose });

    await act(async () => mocks.formSubmit?.({ name: { zh: "标签" } }));

    expect(mocks.error).toHaveBeenCalledWith("添加失败");
    expect(onClose).not.toHaveBeenCalled();
  });
});
