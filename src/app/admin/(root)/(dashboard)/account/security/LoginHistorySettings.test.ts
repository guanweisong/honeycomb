import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  toastError: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    accountSecurity: {
      loginHistory: {
        useQuery: mocks.useQuery,
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError },
}));

import LoginHistorySettings from "./LoginHistorySettings";

const history = [
  {
    id: "history-1",
    event: "LOGIN_SUCCESS" as const,
    provider: "passkey",
    ipAddress: "127.0.0.1",
    userAgent: "Browser",
    createdAt: "2026-08-11T00:00:00.000Z",
  },
];

describe("LoginHistorySettings", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.fetch.mockReturnValue(new Promise(() => {}));
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.useQuery.mockReturnValue({
      data: history,
      error: null,
      isPending: false,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders login history from the tRPC query without native fetch", async () => {
    await act(async () =>
      root.render(React.createElement(LoginHistorySettings)),
    );

    expect(container.textContent).toContain("登录成功");
    expect(container.textContent).toContain("方式：Passkey");
    expect(container.textContent).toContain("127.0.0.1 · Browser");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("shows skeleton placeholders while the tRPC query is pending", async () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      error: null,
      isPending: true,
    });

    await act(async () =>
      root.render(React.createElement(LoginHistorySettings)),
    );

    expect(
      container.querySelectorAll('[data-slot="skeleton"]'),
    ).toHaveLength(2);
  });

  it("shows the empty state for an empty query result", async () => {
    mocks.useQuery.mockReturnValue({
      data: [],
      error: null,
      isPending: false,
    });

    await act(async () =>
      root.render(React.createElement(LoginHistorySettings)),
    );

    expect(container.textContent).toContain("暂无登录历史");
  });

  it("reports a tRPC query error", async () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      error: new Error("request failed"),
      isPending: false,
    });

    await act(async () =>
      root.render(React.createElement(LoginHistorySettings)),
    );

    expect(mocks.toastError).toHaveBeenCalledWith(
      "登录历史加载失败，请稍后重试",
    );
  });
});
