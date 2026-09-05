import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getTurnstileEnv } from "@/env/server";
import {
  getLogger,
  observeExternalServiceOperation,
} from "@/packages/infrastructure/observability/server";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";

const TurnstileVerifyResponseSchema = z.object({
  success: z.boolean(),
  "error-codes": z.array(z.string()).optional(),
});

/** 校验 Cloudflare Turnstile 验证码，并将外部服务错误转换为安全的 API 错误。 */
export const validateCaptcha = async (
  captchaToken: string | undefined | null,
) => {
  const turnstile = getTurnstileEnv();
  if (!turnstile) return;

  if (!captchaToken) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "请提供有效的验证码参数。",
    });
  }

  const body = new URLSearchParams({
    secret: turnstile.secretKey,
    response: captchaToken,
  });

  try {
    await observeExternalServiceOperation("captcha", "validate", async () => {
      const res = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body },
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = TurnstileVerifyResponseSchema.parse(await res.json());
      if (!data.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `验证码不正确 (errors: ${data["error-codes"]?.join(", ") ?? "unknown"})`,
        });
      }
    });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "BAD_REQUEST") {
      throw error;
    }
    getLogger().error(LogEvent.externalServiceOperation, {
      service: "captcha",
      operation: "validate",
      outcome: "error",
      error,
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "验证码服务出现问题。",
    });
  }
};
