import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/auth-client", () => ({
  authClient: { $fetch: mocks.fetch },
}));

import SessionSettings, { formatSessionDate } from "./SessionSettings";

describe("SessionSettings", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.fetch.mockImplementation((path: string) => {
      if (path === "/list-sessions") {
        return Promise.resolve({
          data: [
            {
              id: "session-1",
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              expiresAt: new Date("2026-02-01T00:00:00.000Z"),
              ipAddress: "127.0.0.1",
              userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
            },
            {
              id: "session-2",
              createdAt: new Date("2026-01-02T00:00:00.000Z"),
              expiresAt: new Date("2026-02-02T00:00:00.000Z"),
              ipAddress: null,
              userAgent: "Mozilla/5.0 (Linux; Android 14)",
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: { status: true }, error: null });
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("lists sessions and revokes other sessions", async () => {
    await act(async () => root.render(React.createElement(SessionSettings)));
    await act(async () => Promise.resolve());

    const section = container.querySelector("section");
    expect(section?.className).not.toContain("border-t");
    expect(section?.className).not.toContain("pt-6");
    expect(container.querySelector("h2")).toBeNull();
    expect(container.textContent).toContain("Mac 设备");
    expect(container.textContent).toContain("Android 设备");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="revoke-other-sessions-button"]',
        )
        ?.click();
    });

    expect(mocks.fetch).not.toHaveBeenCalledWith("/revoke-other-sessions", {
      method: "POST",
      body: {},
    });

    await act(async () => {
      const confirmButton = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent?.includes("确认退出"),
      );
      confirmButton?.click();
    });

    expect(mocks.fetch).toHaveBeenCalledWith("/revoke-other-sessions", {
      method: "POST",
      body: {},
    });
  });

  it("formats millisecond timestamps returned as strings", () => {
    expect(formatSessionDate("1786288777627.0")).not.toBe("未知时间");
  });

  it("shows skeleton placeholders while sessions are loading", async () => {
    mocks.fetch.mockReturnValueOnce(new Promise(() => {}));

    await act(async () => root.render(React.createElement(SessionSettings)));

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
