import "server-only";

import { TRPCError } from "@trpc/server";
import { getTurnstileEnv } from "@/env/server";
import {
  getLogger,
  observeExternalServiceOperation,
} from "@/packages/observability/server";
import { LogEvent } from "@/packages/observability/core/names";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Validates a Cloudflare Turnstile captcha token.
 */
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
    await observeExternalServiceOperation(
      "captcha",
      "validate",
      async () => {
        const res = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          { method: "POST", body },
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as TurnstileVerifyResponse;
        if (!data.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `验证码不正确 (errors: ${data["error-codes"]?.join(", ") ?? "unknown"})`,
          });
        }
      },
    );
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
