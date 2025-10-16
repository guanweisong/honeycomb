import { TRPCError } from "@trpc/server";
import axios from "axios";
import { z } from "zod";
import { env } from "@honeycomb/env";

export const CaptchaSchema = z.object({
  ticket: z.string(),
  randstr: z.string(),
});

export type Captcha = z.infer<typeof CaptchaSchema>;

/**
 * Validates a Tencent Captcha.
 * @param captcha - The captcha data from the client.
 * @throws {TRPCError} If the captcha is missing or incorrect.
 */
export const validateCaptcha = async (captcha: Captcha | undefined | null) => {
  if (!captcha || !captcha.ticket || !captcha.randstr) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "请提供有效的验证码参数。",
    });
  }

  try {
    const response = await axios.get<{ response: string }>(
      "https://ssl.captcha.qq.com/ticket/verify",
      {
        params: {
          aid: env.CAPTCHA_AID,
          AppSecretKey: env.CAPTCHA_APP_SECRET_KEY,
          Ticket: captcha.ticket,
          Randstr: captcha.randstr,
        },
      },
    );

    if (response.data.response !== "1") {
      // The codes returned by Tencent are:
      // 1: verification successful
      // 7: Ticket is reused
      // 8: Ticket is expired
      // 9: Ticket is falsified
      // 15: The Ticket is inconsistent with the Randstr
      // 16: The AppSecretKey is inconsistent with the aid
      // 100: The aid and AppSecretKey do not match the developer's account
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `验证码不正确 (response: ${response.data.response})`,
      });
    }
  } catch (error) {
    console.error("Captcha validation error:", error);
    // Re-throw as TRPCError to avoid leaking implementation details to the client
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "验证码服务出现问题。",
    });
  }
};
