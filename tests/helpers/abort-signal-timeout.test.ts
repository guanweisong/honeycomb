// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAbortSignalTimeout } from "./abort-signal-timeout";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("mockAbortSignalTimeout", () => {
  it("preserves independent deadlines and the caller's timeout reason", () => {
    vi.useFakeTimers();
    mockAbortSignalTimeout("Request timed out");
    const first = AbortSignal.timeout(50);
    const second = AbortSignal.timeout(100);
    expect(first).not.toBe(second);
    vi.advanceTimersByTime(49);
    expect(first.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(first.aborted).toBe(true);
    expect(first.reason).toBeInstanceOf(DOMException);
    expect(first.reason.name).toBe("TimeoutError");
    expect(first.reason.message).toBe("Request timed out");
    expect(second.aborted).toBe(false);
    vi.advanceTimersByTime(50);
    expect(second.aborted).toBe(true);
  });
});
