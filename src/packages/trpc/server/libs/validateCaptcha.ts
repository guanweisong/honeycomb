import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const CaptchaSchema = z.object({
  ticket: z.string(),
  randstr: z.string(),
});

export type Captcha = z.infer<typeof CaptchaSchema>;

type TencentCaptchaResponse = {
  response: string;
};

/**
 * Validates a Tencent Captcha.
 */
export const validateCaptcha = async (captcha: Captcha | undefined | null) => {
  if (!captcha?.ticket || !captcha?.randstr) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "请提供有效的验证码参数。",
    });
  }

  const params = new URLSearchParams({
    aid: process.env.CAPTCHA_AID ?? "",
    AppSecretKey: process.env.CAPTCHA_APP_SECRET_KEY ?? "",
    Ticket: captcha.ticket,
    Randstr: captcha.randstr,
  });

  let data: TencentCaptchaResponse;

  try {
    const res = await fetch(
      `https://ssl.captcha.qq.com/ticket/verify?${params.toString()}`,
      {
        method: "GET",
      },
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    data = (await res.json()) as TencentCaptchaResponse;
  } catch (error) {
    console.error("Captcha request failed:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "验证码服务出现问题。",
    });
  }

  if (data.response !== "1") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `验证码不正确 (response: ${data.response})`,
    });
  }
};
