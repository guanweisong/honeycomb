// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import * as intents from "./upload-intent";
const file = {
  name: "a.png",
  type: "image/png" as const,
  size: 3,
  sha256: "a".repeat(64),
};
afterEach(() => vi.useRealTimers());
it("signs a versioned actor-bound temporary upload without persistence", () => {
  const { intent, payload } = intents.createUploadIntent(file, "actor");
  expect(intents.verifyUploadIntent(intent, "actor")).toEqual(payload);
  expect(payload.uploadKey).toMatch(/^temporary\//);
  expect(payload.id).toHaveLength(24);
  expect(payload.sha256).toBe(file.sha256);
});
it("rejects tampering, wrong actor, malformed payload, and expiry", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T00:00:00Z"));
  const { intent } = intents.createUploadIntent(file, "actor");
  expect(() => intents.verifyUploadIntent(`${intent}a`, "actor")).toThrow();
  expect(() => intents.verifyUploadIntent(intent, "other")).toThrow();
  expect(() => intents.verifyUploadIntent("bad.token", "actor")).toThrow();
  vi.advanceTimersByTime(3600_000);
  expect(() => intents.verifyUploadIntent(intent, "actor")).toThrow();
});
it("rejects invalid digests before producing a capability", () => {
  expect(() =>
    intents.createUploadIntent({ ...file, sha256: "A".repeat(64) }, "actor"),
  ).toThrow();
});
