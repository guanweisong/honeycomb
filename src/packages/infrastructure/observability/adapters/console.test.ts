import { afterEach, describe, expect, it, vi } from "vitest";

import { LogEvent } from "../core/names";
import { createConsoleLogger } from "./console";

describe("createConsoleLogger", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes a single-line JSON event with stable common fields", () => {
    const output: string[] = [];
    const logger = createConsoleLogger({
      service: "honeycomb",
      environment: "test",
      write: (line) => output.push(line),
    });

    logger.warn(LogEvent.requestFailed, {
      requestId: "req-1",
      email: "person@example.com",
    });

    expect(output).toHaveLength(1);
    expect(output[0]).not.toContain("\n");
    expect(JSON.parse(output[0]!)).toMatchObject({
      timestamp: expect.any(String),
      level: "warn",
      event: "request.failed",
      service: "honeycomb",
      environment: "test",
      requestId: "req-1",
      email: "[REDACTED]",
    });
  });

  it("fails open when its output sink throws", () => {
    const logger = createConsoleLogger({
      write: () => {
        throw new Error("stdout unavailable");
      },
    });

    expect(() => logger.info(LogEvent.requestStarted)).not.toThrow();
  });

  it("creates a logger without Node process globals", () => {
    vi.stubGlobal("process", undefined);

    expect(() =>
      createConsoleLogger({ write: () => undefined }),
    ).not.toThrow();
  });
});
