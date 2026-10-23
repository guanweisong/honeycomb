import { describe, expect, it, vi } from "vitest";
import { createAdminQueryClient, getAuthErrorCode } from "./admin-query-client";

describe("getAuthErrorCode", () => {
  it.each(["UNAUTHORIZED", "FORBIDDEN"] as const)(
    "recognizes %s tRPC errors",
    (code) => {
      expect(getAuthErrorCode({ data: { code } })).toBe(code);
    },
  );

  it("ignores non-authentication errors", () => {
    expect(getAuthErrorCode({ data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(
      undefined,
    );
    expect(getAuthErrorCode(new Error("network error"))).toBe(undefined);
  });

  it("disables auth retries and keeps bounded retries for ordinary errors", () => {
    const client = createAdminQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;
    if (typeof retry !== "function") throw new Error("Expected retry policy");

    expect(
      retry(
        0,
        Object.assign(new Error("Unauthorized"), {
          data: { code: "UNAUTHORIZED" },
        }),
      ),
    ).toBe(false);
    expect(retry(0, new Error("temporary"))).toBe(true);
    expect(retry(2, new Error("temporary"))).toBe(true);
    expect(retry(3, new Error("temporary"))).toBe(false);
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it("delegates a failed forbidden query to the provided callback without retry", async () => {
    const onForbidden = vi.fn();
    const client = createAdminQueryClient({ onForbidden });
    const error = Object.assign(new Error("Forbidden"), {
      data: { code: "FORBIDDEN" },
    });
    const queryFn = vi.fn(async () => {
      throw error;
    });
    try {
      await expect(
        client.fetchQuery({ queryKey: ["forbidden"], queryFn }),
      ).rejects.toBe(error);
      expect(onForbidden).toHaveBeenCalledOnce();
      expect(queryFn).toHaveBeenCalledOnce();
    } finally {
      client.clear();
    }
  });
});

describe("intent prefetch authentication", () => {
  it.each(["UNAUTHORIZED", "FORBIDDEN"] as const)(
    "preserves the existing %s navigation policy even when prefetch swallows errors",
    async (code) => {
      const onForbidden = vi.fn();
      const replace = vi.fn();
      const previousReplace = window.location.replace;
      window.location.replace = replace;
      const client = createAdminQueryClient({ onForbidden });
      const queryFn = vi.fn(async () => {
        throw Object.assign(new Error(code), { data: { code } });
      });
      try {
        await expect(
          client.prefetchQuery({
            queryKey: ["intent", code],
            queryFn,
            retry: false,
          }),
        ).resolves.toBeUndefined();
        expect(queryFn).toHaveBeenCalledOnce();
        expect(onForbidden).toHaveBeenCalledTimes(code === "FORBIDDEN" ? 1 : 0);
        if (code === "UNAUTHORIZED")
          expect(replace).toHaveBeenCalledWith("/admin/login");
        else expect(replace).not.toHaveBeenCalled();
      } finally {
        client.clear();
        window.location.replace = previousReplace;
      }
    },
  );
});
