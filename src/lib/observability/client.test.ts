// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { clientLogger } from "@/lib/observability/client";
import { LogEvent } from "@/lib/observability/core/names";
import * as sanitizers from "@/lib/observability/core/sanitize";

afterEach(() => vi.restoreAllMocks());

describe("client logger public facade", () => {
  it.each(["info", "warn", "error"] as const)(
    "sanitizes %s output once",
    (level) => {
      const output = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);
      const sanitize = vi.spyOn(sanitizers, "sanitizeContext");
      clientLogger[level](LogEvent.clientError, {
        token: "private-token",
        nested: { password: "private-password" },
        requestId: "client-request",
      });
      expect(sanitize).toHaveBeenCalledTimes(1);
      expect(output).toHaveBeenCalledTimes(1);
      expect(output.mock.calls[0]?.[0]).not.toMatch(
        /private-token|private-password/,
      );
      expect(JSON.parse(output.mock.calls[0]?.[0] ?? "{}")).toMatchObject({
        service: "honeycomb-client",
        requestId: "client-request",
        token: "[REDACTED]",
        nested: { password: "[REDACTED]" },
      });
    },
  );

  it.each(["info", "warn", "error"] as const)(
    "isolates a failing %s output",
    (level) => {
      vi.spyOn(console, "log").mockImplementation(() => {
        throw new Error("stdout unavailable");
      });
      expect(() => clientLogger[level](LogEvent.clientError)).not.toThrow();
    },
  );
});
