import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  refetch: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: mocks }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => true,
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    page: {
      adminIndex: {
        useQuery: () => ({
          data: { list: [{ id: "page-1", version: 4 }], total: 1 },
          refetch: mocks.refetch,
        }),
      },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
  },
}));
vi.mock("@/components/DataTable", () => ({
  DataTable: ({
    data,
    rowActions,
  }: {
    data: { list: { id: string }[] };
    rowActions: (row: { id: string }) => React.ReactNode;
  }) => (
    <div>
      {data.list.map((row) => (
        <div key={row.id}>{rowActions(row)}</div>
      ))}
    </div>
  ),
}));
vi.mock("@/components/Dialog", () => ({
  Dialog: ({ onOK }: { onOK: () => Promise<void> }) => (
    <button onClick={() => void onOK()}>delete</button>
  ),
}));

import Page from "./page";

describe("page deletion public sync feedback", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Page />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function deletePage() {
    const button = Array.from(container.querySelectorAll("button")).find(
      (item) => item.textContent === "delete",
    );
    if (!button) throw new Error("Missing deletion action");
    await act(async () => button.click());
  }

  it.each(["completed", "degraded"])(
    "reports committed %s deletion even if refreshing fails",
    async (publicSync) => {
      mocks.destroy.mockResolvedValue({ success: true, publicSync });
      mocks.refetch.mockRejectedValue(new Error("refresh failed"));
      await deletePage();
      expect(mocks.destroy).toHaveBeenCalledExactlyOnceWith({
        items: [{ id: "page-1", expectedVersion: 4 }],
      });
      expect(mocks.error).not.toHaveBeenCalled();
      if (publicSync === "degraded") {
        expect(mocks.warning).toHaveBeenCalledWith(
          "已保存，公开内容同步未完成，请稍后检查公开页面",
        );
        expect(mocks.success).not.toHaveBeenCalled();
      } else {
        expect(mocks.success).toHaveBeenCalledExactlyOnceWith("删除成功");
        expect(mocks.warning).toHaveBeenCalledWith(
          "已删除，列表待刷新，请勿重复删除",
        );
      }
    },
  );

  it("reports rejected deletion without success or synchronization warning", async () => {
    mocks.destroy.mockRejectedValue(new Error("write failed"));
    await deletePage();
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith("删除失败");
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.warning).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
});
