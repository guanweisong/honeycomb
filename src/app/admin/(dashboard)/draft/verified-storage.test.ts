import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readStoredJson,
  writeVerifiedJson,
} from "@/app/admin/(dashboard)/draft/verified-storage";

describe("synchronous verified browser storage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());
  it("reads JSON without exposing malformed or unavailable storage", () => {
    expect(readStoredJson("key")).toBeNull();
    localStorage.setItem("key", "broken");
    expect(readStoredJson("key")).toBeNull();
    localStorage.setItem("key", '{"creationToken":"owned"}');
    expect(readStoredJson("key")).toEqual({ creationToken: "owned" });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(readStoredJson("key")).toBeNull();
  });
  it("requires the exact serialized value to survive a synchronous readback", () => {
    expect(writeVerifiedJson("key", { creationToken: "owned" })).toBe(true);
    expect(readStoredJson("key")).toEqual({ creationToken: "owned" });
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("different");
    expect(writeVerifiedJson("key", { creationToken: "owned" })).toBe(false);
  });
  it("fails closed when serialization or writing is unavailable", () => {
    expect(writeVerifiedJson("key", undefined)).toBe(false);
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(writeVerifiedJson("key", circular)).toBe(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(writeVerifiedJson("key", { creationToken: "owned" })).toBe(false);
  });
});
