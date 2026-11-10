import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getByRole } from "@testing-library/dom";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import type { PageListItem } from "@/features/page/types/page.read-model";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  destroy: vi.fn(),
  refetch: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: mocks }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/admin/(dashboard)/providers/use-current-user", () => ({
  useCan: () => true,
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({
      page: { adminDetail: { prefetch: vi.fn().mockResolvedValue(undefined) } },
    }),
    page: {
      adminIndex: { useQuery: mocks.query },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
  },
}));
import Page from "@/app/admin/(dashboard)/page/list/page";

function showPage(version: number) {
  const row = {
    id: "page-1",
    version,
    status: PageStatus.DRAFT,
    template: PageTemplate.DEFAULT,
    title: null,
    author: null,
    createdAt: null,
    updatedAt: null,
    views: 0,
  } satisfies PageListItem;
  mocks.query.mockReturnValue({
    data: { list: [row], total: 1 },
    refetch: mocks.refetch,
  });
}

describe("page deletion public sync feedback", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    showPage(4);
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
    await act(async () =>
      getByRole(container, "button", { name: "删除页面" }).click(),
    );
    await confirmDelete();
  }

  async function confirmDelete() {
    await act(async () =>
      getByRole(document.body, "button", { name: "确定" }).click(),
    );
  }

  it("names the page row actions", () => {
    expect(container.querySelector('a[aria-label="编辑页面"]')).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="删除页面"]'),
    ).not.toBeNull();
  });

  it.each(["删除页面", "批量删除"])(
    "uses the current version at confirmation for %s",
    async (action) => {
      mocks.destroy.mockResolvedValue({ success: true });
      mocks.refetch.mockResolvedValue({ isSuccess: true });
      if (action === "批量删除") {
        await act(async () =>
          getByRole(
            getByRole(container, "row", { name: /草稿/ }),
            "checkbox",
          ).click(),
        );
      }
      await act(async () =>
        getByRole(container, "button", { name: action }).click(),
      );
      showPage(5);
      await act(async () => root.render(<Page />));
      await confirmDelete();

      expect(mocks.destroy).toHaveBeenCalledExactlyOnceWith({
        items: [{ id: "page-1", expectedVersion: 5 }],
      });
    },
  );

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
