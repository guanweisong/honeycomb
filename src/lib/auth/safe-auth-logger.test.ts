import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeAuthLogger } from "@/lib/auth/safe-auth-logger";

const logger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/lib/observability/server/registry", () => ({
  getLogger: () => logger,
}));

describe("safe Better Auth diagnostics", () => {
  beforeEach(() => vi.resetAllMocks());

  it("keeps only a known nested digest, never messages, SQL, parameters or causes", () => {
    const stringify = vi.fn(() => "private-toJSON");
    const failure = Object.assign(new Error("private-query SELECT session"), {
      params: ["private-session-token", "private-email@example.test"],
      stack: "private-stack",
      cause: {
        digest: "HANGING_PROMISE_REJECTION",
        message: "private-cause",
        toJSON: stringify,
      },
    });
    safeAuthLogger.log("error", "private-message", failure);

    expect(logger.error).toHaveBeenCalledExactlyOnceWith("server.error", {
      operation: "better-auth",
      diagnosticCode: "HANGING_PROMISE_REJECTION",
    });
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("private-");
    expect(stringify).not.toHaveBeenCalled();
  });

  it("reports unknown failures without echoing unknown codes or text", () => {
    safeAuthLogger.log("warn", "private-message", {
      code: "private-code",
      digest: "private-digest",
      cause: "private-cause",
    });
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith("server.error", {
      operation: "better-auth",
      diagnosticCode: "UNKNOWN",
    });
  });

  it("recognizes only exact known codes, not embedded sensitive text", () => {
    safeAuthLogger.log("error", "INTERNAL_SERVER_ERROR");
    safeAuthLogger.log("error", "SQLITE_BUSY private-session-token");
    expect(
      logger.error.mock.calls.map((call) => call[1]?.diagnosticCode),
    ).toEqual(["INTERNAL_SERVER_ERROR", "UNKNOWN"]);
  });

  it("does not evaluate accessors and tolerates cycles and hostile proxies", () => {
    const getter = vi.fn(() => {
      throw new Error("private-getter");
    });
    const cyclic = { cause: {} };
    cyclic.cause = cyclic;
    Object.defineProperty(cyclic, "code", { get: getter });
    const hostile = new Proxy({}, { getOwnPropertyDescriptor: getter });
    expect(() =>
      safeAuthLogger.log("error", "private-message", cyclic, hostile),
    ).not.toThrow();
    expect(logger.error).toHaveBeenCalledExactlyOnceWith("server.error", {
      operation: "better-auth",
      diagnosticCode: "UNKNOWN",
    });
    // Only the proxy trap runs; the error's code getter is never evaluated.
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it("bounds cause traversal", () => {
    let failure: object = { code: "SQLITE_BUSY" };
    for (let index = 0; index < 20; index++) failure = { cause: failure };
    safeAuthLogger.log("error", "private-message", failure);
    expect(logger.error).toHaveBeenCalledExactlyOnceWith("server.error", {
      operation: "better-auth",
      diagnosticCode: "UNKNOWN",
    });
  });

  it("does not let a diagnostic sink failure replace an authentication failure", () => {
    logger.error.mockImplementationOnce(() => {
      throw new Error("sink failed");
    });
    const failure = new Error("authentication failed");
    expect(() => {
      safeAuthLogger.log("error", "INTERNAL_SERVER_ERROR", failure);
      throw failure;
    }).toThrow(failure);
  });
});
