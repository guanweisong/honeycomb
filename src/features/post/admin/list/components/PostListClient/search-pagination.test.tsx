import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  destroy: vi.fn(),
  can: vi.fn(),
}));

vi.mock("@/packages/ui/admin/use-current-user", () => ({
  useCan: mocks.can,
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    post: {
      adminIndex: { useQuery: mocks.query },
      destroy: { useMutation: () => ({ mutateAsync: mocks.destroy }) },
    },
  },
}));
vi.mock("@/packages/ui/extended/DynamicForm", () => ({
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
vi.mock("@/packages/ui/extended/MultiSelect", () => ({
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

import PostListClient from "./index";

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
      list: [{ id: "post-1", title: null, type: "ARTICLE", status: "DRAFT" }],
      total: 1,
    },
    isFetching: false,
    isError: false,
  });
  await act(async () => root.render(<PostListClient />));

  expect(
    container.querySelector('tbody button[aria-label="编辑文章"]'),
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
    sortField: "createdAt",
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
    sortField: "createdAt",
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
    sortField: "createdAt",
    sortOrder: "desc",
  });
  expect(container.textContent).toContain("第 1 / 4 页");
});
