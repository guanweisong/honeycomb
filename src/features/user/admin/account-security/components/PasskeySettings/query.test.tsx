import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { cleanStores } from "nanostores";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ http: vi.fn<typeof fetch>() }));

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: "user-1" } }),
}));
vi.mock("@/lib/auth/client", async () => {
  const { createAuthClient } = await import("better-auth/react");
  const { passkeyClient } = await import("@better-auth/passkey/client");
  return {
    authClient: createAuthClient({
      baseURL: "http://localhost",
      plugins: [passkeyClient()],
      fetchOptions: { customFetchImpl: mocks.http },
    }),
  };
});

import { authClient } from "@/lib/auth/client";
import PasskeySettings from "./index";

const passkeys = [
  {
    id: "passkey-1",
    name: "MacBook",
    publicKey: "test-public-key",
    userId: "user-1",
    credentialID: "test-credential",
    counter: 0,
    deviceType: "singleDevice",
    backedUp: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
] satisfies NonNullable<ReturnType<typeof authClient.useListPasskeys>["data"]>;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getPasskeyAtom() {
  const atom = authClient.$store.atoms.listPasskeys;
  if (!atom) throw new Error("The Passkey query atom must be available");
  return atom;
}

describe("PasskeySettings with the Better Auth query lifecycle", () => {
  let container: HTMLDivElement;
  let root: Root;
  const atom = getPasskeyAtom();

  beforeEach(() => {
    mocks.http.mockReset();
    atom.set({
      ...atom.get(),
      data: null,
      error: null,
      isPending: true,
      isRefetching: false,
    });
    mocks.http.mockImplementation(async () => jsonResponse(passkeys));
    vi.stubGlobal("PublicKeyCredential", class {});
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    cleanStores(atom);
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderSettled() {
    await act(async () => root.render(<PasskeySettings />));
    await act(async () => {
      await vi.waitFor(() => expect(atom.get().isPending).toBe(false));
    });
  }

  function retryButton() {
    const button = Array.from(container.querySelectorAll("button")).find(
      (item) => item.textContent === "重新加载",
    );
    expect(button).toBeDefined();
    if (!button) throw new Error("The failed read must expose a retry button");
    return button;
  }

  it.each([503, 401])(
    "does not present an initial %i as an empty list",
    async (status) => {
      mocks.http.mockImplementation(async () =>
        jsonResponse({ message: "unavailable" }, status),
      );
      await renderSettled();

      expect(atom.get().data).toBeNull();
      expect(atom.get().error?.status).toBe(status);
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        "Passkey 加载失败",
      );
      expect(container.textContent).not.toContain("暂无 Passkey");
      expect(container.querySelector("ul")).toBeNull();
      expect(
        container.querySelector('[data-testid="passkey-add-button"]'),
      ).toBeNull();
      expect(retryButton().disabled).toBe(false);
    },
  );

  it("shows a retryable read error when the initial network request rejects", async () => {
    mocks.http.mockRejectedValue(new TypeError("Failed to fetch"));
    await renderSettled();

    expect(atom.get().data).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Passkey 加载失败",
    );
    expect(retryButton().disabled).toBe(false);
  });

  it("retries only the failed read and distinguishes a successful empty list", async () => {
    mocks.http.mockImplementationOnce(async () =>
      jsonResponse({ message: "unavailable" }, 503),
    );
    await renderSettled();
    const response = Promise.withResolvers<Response>();
    mocks.http.mockReturnValueOnce(response.promise);

    await act(async () => retryButton().click());
    expect(
      container.querySelector('[aria-label="正在加载 Passkey"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="passkey-add-button"]'),
    ).toBeNull();
    await act(async () => response.resolve(jsonResponse([])));

    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("暂无 Passkey");
    expect(
      container.querySelector('[data-testid="passkey-add-button"]'),
    ).not.toBeNull();
    expect(mocks.http).toHaveBeenCalledTimes(2);
    for (const [url, options] of mocks.http.mock.calls) {
      expect(String(url)).toBe(
        "http://localhost/api/auth/passkey/list-user-passkeys",
      );
      expect(options?.method).toBe("GET");
    }
  });

  it("retains valid records through a failed background refresh and successful retry", async () => {
    await renderSettled();
    const nameInput = container.querySelector<HTMLInputElement>(
      '[data-testid="passkey-name-input"]',
    );
    if (!nameInput) throw new Error("Registration input must be available");
    nameInput.value = "Unsubmitted device name";
    mocks.http.mockImplementationOnce(async () =>
      jsonResponse({ message: "unavailable" }, 503),
    );

    // Better Auth resolves failed refetches; only its atom carries the error.
    await act(async () =>
      expect(atom.get().refetch()).resolves.toBeUndefined(),
    );
    expect(atom.get().error?.status).toBe(503);
    expect(container.querySelector("ul")?.textContent).toContain("MacBook");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Passkey 刷新失败，当前显示上次加载的列表",
    );
    expect(nameInput.value).toBe("Unsubmitted device name");

    const response = Promise.withResolvers<Response>();
    mocks.http.mockReturnValueOnce(response.promise);
    await act(async () => retryButton().click());
    expect(atom.get().isRefetching).toBe(true);
    expect(container.querySelector("ul")?.textContent).toContain("MacBook");
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
    await act(async () =>
      response.resolve(
        jsonResponse([{ ...passkeys[0], name: "Updated MacBook" }]),
      ),
    );
    expect(container.querySelector("ul")?.textContent).toContain(
      "Updated MacBook",
    );
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(nameInput.value).toBe("Unsubmitted device name");
    expect(mocks.http).toHaveBeenCalledTimes(3);
  });

  it("retains valid records when a background network request rejects", async () => {
    await renderSettled();
    mocks.http.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => atom.get().refetch());

    expect(container.querySelector("ul")?.textContent).toContain("MacBook");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Passkey 刷新失败",
    );
    expect(retryButton().disabled).toBe(false);
  });

  it("does not resurrect records cleared by an unauthorized background response", async () => {
    await renderSettled();
    mocks.http.mockImplementationOnce(async () =>
      jsonResponse({ message: "unauthorized" }, 401),
    );
    await act(async () => atom.get().refetch());

    expect(atom.get().data).toBeNull();
    expect(container.textContent).not.toContain("MacBook");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Passkey 加载失败",
    );
    expect(
      container.querySelector('[data-testid="passkey-add-button"]'),
    ).toBeNull();

    mocks.http.mockImplementationOnce(async () =>
      jsonResponse({ message: "unavailable" }, 503),
    );
    await act(async () => retryButton().click());
    expect(container.textContent).not.toContain("MacBook");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Passkey 加载失败",
    );
  });
});
