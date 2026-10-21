import React, { act } from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockPie = vi.fn();

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-testid": "custom-pie-responsive" },
      children,
    ),
  PieChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "custom-pie-chart" }, children),
  Pie: ({
    data,
    children,
  }: {
    data?: { item: string; count: number }[];
    children: React.ReactNode;
  }) => {
    mockPie(data);
    return React.createElement(
      "div",
      { "data-testid": "custom-pie" },
      children,
    );
  },
  Tooltip: () =>
    React.createElement("div", { "data-testid": "custom-pie-tooltip" }),
  Legend: ({
    formatter,
  }: {
    formatter: (value: string, entry: object, index: number) => React.ReactNode;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "custom-pie-legend" },
      (mockPie.mock.lastCall?.[0] ?? []).map(
        (row: { item: string }, index: number) =>
          React.createElement(
            "div",
            { key: row.item },
            formatter(row.item, {}, index),
          ),
      ),
    ),
  Cell: () => null,
}));

import CustomPie from "./index";

describe("CustomPie", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockPie.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("calculates legend totals once and preserves the input order", async () => {
    const data = [
      { item: "B", count: 1 },
      { item: "A", count: 3 },
    ];
    const reduce = vi.spyOn(data, "reduce");
    await act(async () =>
      root.render(
        React.createElement(CustomPie, { title: "Contributions", data }),
      ),
    );
    expect(container.textContent).toContain("A75%");
    expect(container.textContent).toContain("B25%");
    expect(reduce).toHaveBeenCalledTimes(1);
    expect(data.map((row) => row.item)).toEqual(["B", "A"]);
  });

  it("renders zero totals without NaN or Infinity", async () => {
    await act(async () =>
      root.render(
        React.createElement(CustomPie, {
          title: "Empty",
          data: [{ item: "A", count: 0 }],
        }),
      ),
    );
    expect(container.textContent).toContain("A0%");
  });

  it("does not inspect chart values while loading", async () => {
    const count = vi.fn(() => 1);
    const data = [
      {
        item: "A",
        get count() {
          return count();
        },
      },
      {
        item: "B",
        get count() {
          return count();
        },
      },
    ];
    await act(async () =>
      root.render(
        React.createElement(CustomPie, {
          title: "Loading",
          loading: true,
          data,
        }),
      ),
    );
    expect(count).not.toHaveBeenCalled();
  });

  it("shows a loading skeleton while data is loading", async () => {
    await act(async () => {
      root.render(
        React.createElement(CustomPie, { title: "文章", loading: true }),
      );
    });

    expect(container.textContent).toContain("文章");
    expect(
      container.querySelector('[data-testid="custom-pie-loading-skeleton"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="custom-pie-chart"]'),
    ).toBeNull();
    expect(mockPie).not.toHaveBeenCalled();
  });

  it("renders the chart with data sorted by count descending", async () => {
    await act(async () => {
      root.render(
        React.createElement(CustomPie, {
          title: "文章",
          data: [
            { item: "B", count: 1 },
            { item: "A", count: 3 },
            { item: "C", count: 2 },
          ],
        }),
      );
    });

    expect(
      container.querySelector('[data-testid="custom-pie-loading-skeleton"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="custom-pie-chart"]'),
    ).not.toBeNull();
    expect(mockPie).toHaveBeenCalledWith([
      { item: "A", count: 3 },
      { item: "C", count: 2 },
      { item: "B", count: 1 },
    ]);
  });
});
