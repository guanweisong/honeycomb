import { z } from "zod";

/**
 * 通用的人机验证（验证码） schema。
 *
 * 此 schema 用于验证前端传递的 Cloudflare Turnstile 验证码 token，
 * 通常用于登录、评论等操作，以防止机器人攻击。
 * - `captchaToken`: 由 Cloudflare Turnstile 生成的验证 token。
 */
export const CaptchaSchema = z.object({
  captchaToken: z.string().min(1).max(2048),
});
