import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("DashboardPageClient boundary", () => {
  it("keeps the tRPC query in the client shell", () => {
    const source = readFileSync(
      resolve(
        "src/features/dashboard/admin/components/DashboardPageClient/index.tsx",
      ),
      "utf8",
    );
    expect(source).toContain('"use client"');
    expect(source).toContain("trpc.statistic.index.useQuery");
  });
});

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: { statistic: { index: { useQuery: mocks.query } } },
}));
vi.mock("../CustomPie", () => ({
  default: ({
    title,
    loading,
    data,
  }: {
    title: string;
    loading: boolean;
    data?: { count: number }[];
  }) =>
    React.createElement(
      "div",
      { "data-chart": title, "aria-busy": loading },
      JSON.stringify(data),
    ),
}));
import DashboardPageClient from "./index";

describe("DashboardPageClient query feedback", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const data = {
    postType: [],
    userType: [],
    commentStatus: [],
    userPost: [{ item: "Alice", count: 3 }],
  };
  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  it("shows an error rather than empty statistics on initial failure and retries", async () => {
    mocks.query.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: mocks.refetch,
    });
    await act(async () =>
      root.render(React.createElement(DashboardPageClient)),
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "统计加载失败",
    );
    expect(container.querySelectorAll("[data-chart]")).toHaveLength(0);
    await act(async () => container.querySelector("button")?.click());
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
  it("keeps cached statistics visible when refresh fails", async () => {
    mocks.query.mockReturnValue({
      data,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: mocks.refetch,
    });
    await act(async () =>
      root.render(React.createElement(DashboardPageClient)),
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "刷新失败",
    );
    expect(container.querySelectorAll("[data-chart]")).toHaveLength(4);
    expect(container.textContent).toContain("Alice");
  });
  it("retains error feedback and disables retry while fetching", async () => {
    mocks.query.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: true,
      isFetching: true,
      refetch: mocks.refetch,
    });
    await act(async () =>
      root.render(React.createElement(DashboardPageClient)),
    );
    expect(container.querySelector("button")?.disabled).toBe(true);
  });
  it.each([true, false])(
    "distinguishes initial pending from a successful empty result: %s",
    async (isLoading) => {
      mocks.query.mockReturnValue({
        data: isLoading ? undefined : { ...data, userPost: [] },
        isLoading,
        isError: false,
        isFetching: isLoading,
        refetch: mocks.refetch,
      });
      await act(async () =>
        root.render(React.createElement(DashboardPageClient)),
      );
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(container.querySelectorAll("[data-chart]")).toHaveLength(4);
      expect(
        container.querySelector("[data-chart]")?.getAttribute("aria-busy"),
      ).toBe(String(isLoading));
    },
  );
});
