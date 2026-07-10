import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { validateCaptcha } from "./validateCaptcha";

describe("validateCaptcha", () => {
  const fetchMock = vi.fn();
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.TURNSTILE_SECRET_KEY = "secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
  });

  it("rejects when the token is missing", async () => {
    await expect(validateCaptcha(undefined)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "请提供有效的验证码参数。",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when the verification service returns a failure", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    });

    await expect(validateCaptcha("token")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "验证码不正确 (errors: invalid-input-response)",
    });
  });

  it("rejects when the verification request fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(validateCaptcha("token")).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "验证码服务出现问题。",
    });
  });

  it("resolves when the verification succeeds", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
      }),
    });

    await expect(validateCaptcha("token")).resolves.toBeUndefined();
  });
});
