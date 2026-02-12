import { TRPCError } from "@trpc/server";

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
  if (!captchaToken) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "请提供有效的验证码参数。",
    });
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY ?? "",
    response: captchaToken,
  });

  let data: TurnstileVerifyResponse;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
      },
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    data = (await res.json()) as TurnstileVerifyResponse;
  } catch (error) {
    console.error("Captcha request failed:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "验证码服务出现问题。",
    });
  }

  if (!data.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `验证码不正确 (errors: ${data["error-codes"]?.join(", ") ?? "unknown"})`,
    });
  }
};
