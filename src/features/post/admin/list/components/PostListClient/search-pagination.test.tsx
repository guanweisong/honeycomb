import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  destroy: vi.fn(),
  can: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, warning: mocks.warning, error: mocks.error },
}));

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: mocks.can,
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    useUtils: () => ({
      post: { adminDetail: { prefetch: vi.fn().mockResolvedValue(undefined) } },
    }),
    post: {
      adminIndex: { useQuery: mocks.query },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
  },
}));
vi.mock("@/components/DynamicForm", () => ({
  DynamicForm: ({
    onSubmit,
  }: {
    onSubmit: (values: { title: string }) => void;
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          title: String(new FormData(event.currentTarget).get("title") ?? ""),
        });
      }}
    >
      <input name="title" aria-label="title" />
      <button type="submit">查询</button>
    </form>
  ),
}));
vi.mock("@/components/MultiSelect", () => ({
  MultiSelect: ({
    options,
    value,
    onChange,
  }: {
    options: { label: string; value: string }[];
    value: string[];
    onChange: (values: string[]) => void;
  }) => (
    <select
      value={value[0] ?? ""}
      onChange={(event) => onChange([event.target.value])}
    >
      <option value="">全部</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

import PostListClient from "@/features/post/admin/list/components/PostListClient/index";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.can.mockReturnValue(false);
  mocks.query.mockReturnValue({
    data: { list: [], total: 80 },
    isFetching: false,
    isError: false,
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function lastQuery() {
  return requireDefined(mocks.query.mock.lastCall)[0];
}

it("names the icon-only row actions", async () => {
  mocks.can.mockReturnValue(true);
  mocks.query.mockReturnValue({
    data: {
      list: [
        {
          id: "post-1",
          version: 3,
          title: null,
          type: "ARTICLE",
          status: "DRAFT",
        },
      ],
      total: 1,
    },
    isFetching: false,
    isError: false,
  });
  await act(async () => root.render(<PostListClient />));

  expect(
    container.querySelector('tbody a[aria-label="编辑文章"]'),
  ).not.toBeNull();
  expect(
    container.querySelector('tbody button[aria-label="删除文章"]'),
  ).not.toBeNull();
});

async function nextPage() {
  await act(async () => {
    requireDefined(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "下一页",
      ),
    ).click();
  });
}

async function search(title: string) {
  requireDefined(container.querySelector("input")).value = title;
  await act(async () => {
    requireDefined(container.querySelector("form")).dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}

it("keeps title search, filters and sorting together while resetting the displayed page", async () => {
  await act(async () => root.render(<PostListClient />));
  await act(async () => {
    requireDefined(
      Array.from(container.querySelectorAll("th")).find((header) =>
        header.textContent?.includes("发表时间"),
      ),
    ).click();
    const status = requireDefined(
      Array.from(container.querySelectorAll("select")).find((select) =>
        Array.from(select.options).some(
          (option) => option.value === "PUBLISHED",
        ),
      ),
    );
    status.value = "PUBLISHED";
    status.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await nextPage();
  await nextPage();
  expect(lastQuery()).toMatchObject({
    page: 3,
    sortField: "updatedAt",
    sortOrder: "desc",
    status: ["PUBLISHED"],
  });
  expect(container.textContent).toContain("第 3 / 4 页");

  await search("honeycomb");
  expect(lastQuery()).toMatchObject({
    page: 1,
    limit: 20,
    title: "honeycomb",
    status: ["PUBLISHED"],
    sortField: "updatedAt",
    sortOrder: "desc",
  });
  expect(container.textContent).toContain("第 1 / 4 页");

  await nextPage();
  expect(lastQuery()).toMatchObject({
    page: 2,
    title: "honeycomb",
    status: ["PUBLISHED"],
  });
  expect(container.textContent).toContain("第 2 / 4 页");

  await search("");
  expect(lastQuery()).toEqual({
    page: 1,
    limit: 20,
    status: ["PUBLISHED"],
    sortField: "updatedAt",
    sortOrder: "desc",
  });
  expect(container.textContent).toContain("第 1 / 4 页");
});

it.each(["completed", "degraded"])(
  "keeps a deleted post successful after %s synchronization when refresh fails",
  async (publicSync) => {
    mocks.can.mockReturnValue(true);
    mocks.query.mockReturnValue({
      data: {
        list: [
          {
            id: "post-1",
            version: 3,
            title: null,
            type: "ARTICLE",
            status: "DRAFT",
          },
        ],
        total: 1,
      },
      isFetching: false,
      isError: false,
      refetch: mocks.refetch,
    });
    mocks.destroy.mockResolvedValue({ success: true, publicSync });
    mocks.refetch.mockRejectedValue(new Error("refresh failed"));
    await act(async () => root.render(<PostListClient />));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="删除文章"]')
        ?.click(),
    );
    await act(async () => {
      requireDefined(
        Array.from(document.querySelectorAll("button")).find(
          (button) => button.textContent === "确定",
        ),
      ).click();
    });
    expect(mocks.destroy).toHaveBeenCalledExactlyOnceWith({
      items: [{ id: "post-1", expectedVersion: 3 }],
    });
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

async function confirmDelete() {
  await act(async () =>
    requireDefined(
      Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "确定",
      ),
    ).click(),
  );
}

function showPosts(version = 3) {
  mocks.can.mockReturnValue(true);
  mocks.query.mockReturnValue({
    data: {
      list: [
        {
          id: "post-1",
          version,
          title: null,
          type: "ARTICLE",
          status: "DRAFT",
        },
        {
          id: "post-2",
          version: 7,
          title: null,
          type: "ARTICLE",
          status: "DRAFT",
        },
      ],
      total: 2,
    },
    isFetching: false,
    isError: false,
    refetch: mocks.refetch,
  });
}

it("deletes the clicked version even if the list refreshes before confirmation", async () => {
  showPosts();
  mocks.destroy.mockResolvedValue({ success: true });
  await act(async () => root.render(<PostListClient />));
  await act(async () =>
    requireDefined(
      container.querySelector<HTMLButtonElement>('[aria-label="删除文章"]'),
    ).click(),
  );
  showPosts(4);
  await act(async () => root.render(<PostListClient />));
  await confirmDelete();
  expect(mocks.destroy).toHaveBeenCalledExactlyOnceWith({
    items: [{ id: "post-1", expectedVersion: 3 }],
  });
});

it.each(["CONFLICT", "offline"])(
  "keeps batch selection and dialog on %s, then clears after success",
  async (failure) => {
    showPosts();
    mocks.destroy
      .mockRejectedValueOnce(new Error(failure))
      .mockResolvedValueOnce({ success: true });
    await act(async () => root.render(<PostListClient />));
    const checkboxes = container.querySelectorAll<HTMLButtonElement>(
      'tbody [role="checkbox"]',
    );
    await act(async () => checkboxes.item(0).click());
    await act(async () => checkboxes.item(1).click());
    const batchButton = () =>
      requireDefined(
        Array.from(container.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("批量删除"),
        ),
      );
    await act(async () => batchButton().click());
    showPosts(9);
    await act(async () => root.render(<PostListClient />));
    await confirmDelete();
    expect(mocks.destroy).toHaveBeenLastCalledWith({
      items: expect.arrayContaining([
        { id: "post-1", expectedVersion: 3 },
        { id: "post-2", expectedVersion: 7 },
      ]),
    });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(batchButton().disabled).toBe(false);
    expect(mocks.refetch).not.toHaveBeenCalled();
    await confirmDelete();
    expect(mocks.destroy.mock.calls[1]).toEqual(mocks.destroy.mock.calls[0]);
    expect(batchButton().disabled).toBe(true);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  },
);
