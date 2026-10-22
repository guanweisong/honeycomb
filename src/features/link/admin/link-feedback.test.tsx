import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import type { LinkRecord } from "@/features/link/types/link.record";
import { EnableStatus } from "@/lib/validation/enable-status";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
  refetch: vi.fn(),
  selection: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, warning: mocks.warning, error: mocks.error },
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    link: {
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
  },
}));

import { useLinkActions } from "./link-actions";

const record: LinkRecord = {
  id: "507f1f77bcf86cd799439011",
  name: "OpenAI",
  url: "https://openai.com",
  logo: "https://openai.com/logo.png",
  description: null,
  status: EnableStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
};
const values = {
  name: "OpenAI",
  url: "https://openai.com",
  logo: "https://openai.com/logo.png",
};

let actions: ReturnType<typeof useLinkActions> | undefined;
function Harness() {
  const currentActions = useLinkActions({
    selectedRows: [record],
    onSelectionChange: mocks.selection,
    refetch: mocks.refetch,
  });
  React.useEffect(() => {
    actions = currentActions;
  }, [currentActions]);
  return null;
}

describe("Link public-sync feedback", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    actions = undefined;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<Harness />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  describe.each(["create", "update", "destroy"] as const)("%s", (operation) => {
    it.each([
      { publicSync: "completed", refreshFails: false },
      { publicSync: "degraded", refreshFails: false },
      { publicSync: "completed", refreshFails: true },
      { publicSync: "degraded", refreshFails: true },
    ])(
      "keeps committed $publicSync writes successful (refresh rejects: $refreshFails)",
      async ({ publicSync, refreshFails }) => {
        mocks[operation].mockResolvedValue({
          ...record,
          success: true,
          publicSync,
        });
        if (refreshFails)
          mocks.refetch.mockRejectedValue(new Error("refresh failed"));

        if (operation === "create") {
          await act(async () => requireDefined(actions).handleAddNew());
          await act(async () => requireDefined(actions).handleModalOk(values));
        } else if (operation === "update") {
          await act(async () => requireDefined(actions).handleEditItem(record));
          await act(async () =>
            requireDefined(actions).handleModalOk({
              id: record.id,
              name: "Updated",
            }),
          );
        } else {
          await act(async () => requireDefined(actions).handleDeleteBatch());
          expect(mocks.selection).toHaveBeenCalledExactlyOnceWith([]);
        }

        expect(mocks[operation]).toHaveBeenCalledOnce();
        expect(mocks.refetch).toHaveBeenCalledOnce();
        expect(requireDefined(actions).dialogState.open).toBe(false);
        expect(mocks.error).not.toHaveBeenCalled();
        if (publicSync === "degraded") {
          expect(mocks.warning).toHaveBeenCalledExactlyOnceWith(
            "已保存，公开内容同步未完成，请稍后检查公开页面",
          );
          expect(mocks.success).not.toHaveBeenCalled();
        } else {
          expect(mocks.success).toHaveBeenCalledExactlyOnceWith(
            operation === "create"
              ? "添加成功"
              : operation === "update"
                ? "更新成功"
                : "删除成功",
          );
          expect(mocks.warning).not.toHaveBeenCalled();
        }
      },
    );
  });
});
