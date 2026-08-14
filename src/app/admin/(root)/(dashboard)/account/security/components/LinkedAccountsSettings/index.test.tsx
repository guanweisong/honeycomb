import React, { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  linkSocial: vi.fn(),
  unlinkAccount: vi.fn(),
}));

vi.mock("@/auth-client", () => ({ authClient: mocks }));

import LinkedAccountsSettings from "./index";

describe("LinkedAccountsSettings", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.listAccounts.mockResolvedValue({
      data: [
        {
          id: "account-credential",
          accountId: "credential-1",
          providerId: "credential",
        },
        { id: "account-1", accountId: "github-1", providerId: "github" },
      ],
      error: null,
    });
    mocks.unlinkAccount.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it("lists linked providers and refreshes after unlinking", async () => {
    await act(async () =>
      root.render(
        React.createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          React.createElement(LinkedAccountsSettings, { providers: ["github"] }),
        ),
      ),
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(container.textContent).toContain("GitHub");
    expect(container.textContent).toContain("已关联");

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("解除关联"))
        ?.click();
    });
    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("确认解除"))
        ?.click();
    });

    expect(mocks.unlinkAccount).toHaveBeenCalledWith({
      providerId: "github",
      accountId: "github-1",
    });
    expect(mocks.listAccounts).toHaveBeenCalledTimes(2);
  });

  it("does not show providers that are not enabled", async () => {
    await act(async () =>
      root.render(
        React.createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          React.createElement(LinkedAccountsSettings, { providers: [] }),
        ),
      ),
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(container.textContent).toContain("当前环境未配置");
    expect(container.textContent).not.toContain("GitHub");
  });
});
