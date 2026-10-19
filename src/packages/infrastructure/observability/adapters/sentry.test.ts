// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createSentryLogger } from "./sentry";
import { LogEvent } from "../core/names";
const sink = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
describe("Sentry logger", () => {
  it.each(["info", "warn", "error"] as const)(
    "forwards %s once to each sink",
    (level) => {
      const remote = sink();
      const local = sink();
      createSentryLogger(remote, local)[level](LogEvent.requestCompleted, {
        requestId: "test",
        duration: 4,
      });
      expect(local[level]).toHaveBeenCalledTimes(1);
      expect(remote[level]).toHaveBeenCalledExactlyOnceWith(
        "request.completed",
        { requestId: "test", duration: 4, service: "honeycomb" },
      );
    },
  );
  it("redacts nested secrets and error text before forwarding", () => {
    const remote = sink();
    const local = sink();
    createSentryLogger(remote, local).error(LogEvent.serverError, {
      authorization: "private-key",
      nested: { password: "private-password" },
      error: new Error("token=private-token person@example.com"),
    });
    expect(JSON.stringify(remote.error.mock.calls)).not.toMatch(
      /private-key|private-password|private-token|person@example.com/,
    );
    expect(remote.error.mock.calls[0]?.[1]?.nested).toBe(
      '{"password":"[REDACTED]"}',
    );
  });
  it.each(["local", "remote"])("isolates a failing %s sink", (failing) => {
    const remote = sink();
    const local = sink();
    (failing === "local" ? local : remote).info.mockImplementation(() => {
      throw new Error("sink failed");
    });
    expect(() =>
      createSentryLogger(remote, local).info(LogEvent.requestCompleted),
    ).not.toThrow();
    expect(local.info).toHaveBeenCalledTimes(1);
    expect(remote.info).toHaveBeenCalledTimes(1);
  });
});
