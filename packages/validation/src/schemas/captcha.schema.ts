import { z } from "zod";

export const CaptchaSchema = z.object({
  captcha: z.object({
    randstr: z.string().min(1).max(500),
    ticket: z.string().min(1).max(500),
  }),
});
