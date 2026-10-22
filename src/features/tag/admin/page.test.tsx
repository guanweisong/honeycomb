import React, { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import type { TagRecord } from "@/features/tag/types/tag.record";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  refetch: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  submitted: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, warning: mocks.warning, error: mocks.error },
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    tag: {
      index: {
        useQuery: () => ({
          data: { list: [], total: 0 },
          refetch: mocks.refetch,
        }),
      },
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
  },
}));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => true,
}));
vi.mock("./tag-table-columns", () => ({ tagTableColumns: [] }));
vi.mock("@/components/DataTable", () => ({
  DataTable: ({ rowActions }: { rowActions: (row: TagRecord) => ReactNode }) =>
    rowActions({
      id: "507f1f77bcf86cd799439011",
      name: { zh: "标签", en: "Tag" },
      createdAt: null,
      updatedAt: null,
    }),
}));
vi.mock("@/components/Dialog", () => ({
  Dialog: ({
    children,
    trigger,
    onOK,
  }: {
    children?: ReactNode;
    trigger?: ReactNode;
    onOK?: () => Promise<void>;
  }) => (
    <>
      {children}
      {trigger}
      {onOK && (
        <button data-delete onClick={() => void onOK()}>
          delete
        </button>
      )}
    </>
  ),
}));
vi.mock("@/components/DynamicForm", () => ({
  DynamicForm: ({
    onSubmit,
  }: {
    onSubmit: (values: { name: { zh: string; en: string } }) => Promise<void>;
  }) => (
    <button
      data-create
      onClick={() =>
        void onSubmit({ name: { zh: "新标签", en: "Tag" } }).then(() =>
          mocks.submitted(),
        )
      }
    >
      create
    </button>
  ),
}));

import Tag from "./page";

describe("Tag page public-sync feedback", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<Tag />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("names the tag row actions", () => {
    expect(
      container.querySelector('button[aria-label="编辑标签"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="删除标签"]'),
    ).not.toBeNull();
  });

  it("waits for the page refresh callback after creating a tag", async () => {
    mocks.create.mockResolvedValue({ publicSync: "completed" });
    let finishRefresh: (() => void) | undefined;
    mocks.refetch.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRefresh = resolve;
        }),
    );

    await act(async () =>
      requireDefined(
        container.querySelector<HTMLButtonElement>("[data-create]"),
      ).click(),
    );
    try {
      expect(mocks.refetch).toHaveBeenCalledOnce();
      expect(mocks.submitted).not.toHaveBeenCalled();
    } finally {
      await act(async () => requireDefined(finishRefresh)());
    }
    expect(mocks.submitted).toHaveBeenCalledOnce();
  });

  describe.each(["create", "destroy"] as const)("%s", (operation) => {
    it.each([
      { publicSync: "completed", refreshFails: false },
      { publicSync: "degraded", refreshFails: false },
      { publicSync: "completed", refreshFails: true },
      { publicSync: "degraded", refreshFails: true },
    ])(
      "keeps committed $publicSync writes successful (refresh rejects: $refreshFails)",
      async ({ publicSync, refreshFails }) => {
        mocks[operation].mockResolvedValue({ success: true, publicSync });
        if (refreshFails)
          mocks.refetch.mockRejectedValue(new Error("refresh failed"));

        await act(async () =>
          requireDefined(
            container.querySelector<HTMLButtonElement>(
              operation === "create" ? "[data-create]" : "[data-delete]",
            ),
          ).click(),
        );

        expect(mocks[operation]).toHaveBeenCalledOnce();
        expect(mocks.refetch).toHaveBeenCalledOnce();
        expect(mocks.error).not.toHaveBeenCalled();
        if (publicSync === "degraded") {
          expect(mocks.warning).toHaveBeenCalledExactlyOnceWith(
            "已保存，公开内容同步未完成，请稍后检查公开页面",
          );
          expect(mocks.success).not.toHaveBeenCalled();
        } else {
          expect(mocks.success).toHaveBeenCalledExactlyOnceWith(
            operation === "create" ? "添加成功" : "删除成功",
          );
          expect(mocks.warning).not.toHaveBeenCalled();
        }
      },
    );
  });
});
