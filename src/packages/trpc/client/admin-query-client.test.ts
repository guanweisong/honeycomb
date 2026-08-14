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
    const retry = client.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    expect(retry(0, { data: { code: "UNAUTHORIZED" } })).toBe(false);
    expect(retry(0, new Error("temporary"))).toBe(true);
    expect(retry(2, new Error("temporary"))).toBe(true);
    expect(retry(3, new Error("temporary"))).toBe(false);
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it("delegates forbidden handling to the provided callback", () => {
    const onForbidden = vi.fn();
    const client = createAdminQueryClient({ onForbidden });
    const cache = client.getQueryCache();

    cache.config.onError?.(
      { data: { code: "FORBIDDEN" } } as never,
      {} as never,
    );
    expect(onForbidden).toHaveBeenCalledOnce();
  });
});
