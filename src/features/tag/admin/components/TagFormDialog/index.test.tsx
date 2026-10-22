import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  formSubmit: undefined as
    ((values: Record<string, unknown>) => Promise<void>) | undefined,
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, warning: mocks.warning, error: mocks.error },
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    tag: {
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
  }) => {
    mocks.formSubmit = props.onSubmit;
    return <div>dynamic-form</div>;
  },
}));

import { ModalType } from "@/components/admin/types/modal-type";
import TagFormDialog, { type TagFormDialogProps } from ".";

describe("TagFormDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.create.mockReset().mockResolvedValue(undefined);
    mocks.update.mockReset().mockResolvedValue(undefined);
    mocks.success.mockClear();
    mocks.warning.mockClear();
    mocks.error.mockClear();
    mocks.formSubmit = undefined;
  });

  function render(props: TagFormDialogProps) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<TagFormDialog {...props} />));
  }

  it.each(
    ["write", "refresh"].flatMap((phase) =>
      ["reopen", "switch", "unmount"].map((change) => ({ phase, change })),
    ),
  )(
    "does not close a new session after old $phase completes ($change)",
    async ({ phase, change }) => {
      let finish: (() => void) | undefined;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const onClose = vi.fn();
      const onSuccess = vi.fn(() =>
        phase === "refresh" ? pending : undefined,
      );
      if (phase === "write") mocks.create.mockReturnValueOnce(pending);
      const props = { type: ModalType.ADD, open: true, onClose, onSuccess };
      render(props);
      let saving: Promise<void> | undefined;
      await act(async () => {
        saving = mocks.formSubmit?.({ name: { zh: "旧标签", en: "Old" } });
      });
      if (change === "unmount") act(() => root.render(null));
      else if (change === "switch")
        act(() =>
          root.render(
            <TagFormDialog
              {...props}
              type={ModalType.EDIT}
              record={{
                id: "507f1f77bcf86cd799439012",
                name: { zh: "新标签", en: "New" },
                createdAt: null,
                updatedAt: null,
              }}
            />,
          ),
        );
      else {
        act(() => root.render(<TagFormDialog {...props} open={false} />));
        act(() => root.render(<TagFormDialog {...props} />));
      }
      await act(async () => {
        finish?.();
        await saving;
      });
      expect(onClose).not.toHaveBeenCalled();
    },
  );

  describe.each([ModalType.ADD, ModalType.EDIT])(
    "public-sync feedback for %s",
    (type) => {
      it.each([
        { publicSync: "completed", refreshFails: false },
        { publicSync: "degraded", refreshFails: false },
        { publicSync: "completed", refreshFails: true },
        { publicSync: "degraded", refreshFails: true },
      ])(
        "closes a committed $publicSync write (refresh rejects: $refreshFails)",
        async ({ publicSync, refreshFails }) => {
          const mutation = type === ModalType.ADD ? mocks.create : mocks.update;
          mutation.mockResolvedValue({
            id: "507f1f77bcf86cd799439011",
            publicSync,
          });
          const onClose = vi.fn();
          const onSuccess = vi.fn();
          if (refreshFails)
            onSuccess.mockRejectedValue(new Error("refresh failed"));
          render({
            type,
            open: true,
            record: {
              id: "507f1f77bcf86cd799439011",
              name: { zh: "标签", en: "Tag" },
              createdAt: null,
              updatedAt: null,
            },
            onClose,
            onSuccess,
          });

          await act(async () =>
            mocks.formSubmit?.({ name: { zh: "新标签", en: "Tag" } }),
          );

          expect(mutation).toHaveBeenCalledOnce();
          expect(onSuccess).toHaveBeenCalledOnce();
          expect(onClose).toHaveBeenCalledOnce();
          expect(mocks.error).not.toHaveBeenCalled();
          if (publicSync === "degraded") {
            expect(mocks.warning).toHaveBeenCalledExactlyOnceWith(
              "已保存，公开内容同步未完成，请稍后检查公开页面",
            );
            expect(mocks.success).not.toHaveBeenCalled();
          } else {
            expect(mocks.success).toHaveBeenCalledExactlyOnceWith(
              type === ModalType.ADD ? "添加成功" : "更新成功",
            );
            expect(mocks.warning).not.toHaveBeenCalled();
          }
        },
      );
    },
  );

  it("creates a tag and closes after success", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const values = { name: { zh: "标签", en: "English" } };
    render({ type: ModalType.ADD, open: true, onClose, onSuccess });

    await act(async () => mocks.formSubmit?.(values));

    expect(mocks.create).toHaveBeenCalledWith(values);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledWith("添加成功");
  });

  it("updates an existing tag with its id", async () => {
    const values = { name: { zh: "更新标签", en: "English" } };
    render({
      type: ModalType.EDIT,
      open: true,
      record: {
        id: "507f1f77bcf86cd799439011",
        name: { zh: "旧标签", en: "English" },
        createdAt: null,
        updatedAt: null,
      },
    });

    await act(async () => mocks.formSubmit?.(values));

    expect(mocks.update).toHaveBeenCalledWith({
      ...values,
      id: "507f1f77bcf86cd799439011",
    });
    expect(mocks.success).toHaveBeenCalledWith("更新成功");
  });

  it("rejects an edit submission when the tag record is missing", async () => {
    render({ type: ModalType.EDIT, open: true });

    await act(async () =>
      mocks.formSubmit?.({ name: { zh: "更新标签", en: "English" } }),
    );

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("标签不存在，无法更新");
  });

  it("reports a failed create without closing the dialog", async () => {
    mocks.create.mockRejectedValueOnce(new Error("network error"));
    const onClose = vi.fn();
    render({ type: ModalType.ADD, open: true, onClose });

    await act(async () =>
      mocks.formSubmit?.({ name: { zh: "标签", en: "English" } }),
    );

    expect(mocks.error).toHaveBeenCalledWith("添加失败");
    expect(onClose).not.toHaveBeenCalled();
  });
});
