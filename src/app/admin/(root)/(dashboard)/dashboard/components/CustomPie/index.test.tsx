import React, { act } from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

const mockPie = vi.fn();

vi.mock("recharts", () => ({
  ResponsiveContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "custom-pie-responsive" },
      children,
    ),
  PieChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-testid": "custom-pie-chart" },
      children,
    ),
  Pie: ({
    data,
    children,
  }: {
    data?: { item: string; count: number }[];
    children: React.ReactNode;
  }) => {
    mockPie(data);
    return React.createElement("div", { "data-testid": "custom-pie" }, children);
  },
  Tooltip: () => React.createElement("div", { "data-testid": "custom-pie-tooltip" }),
  Legend: () => React.createElement("div", { "data-testid": "custom-pie-legend" }),
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

  it("shows a loading skeleton while data is loading", async () => {
    await act(async () => {
      root.render(React.createElement(CustomPie, { title: "文章", loading: true }));
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
