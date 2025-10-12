import { z } from "zod";

/**
 * 通用的人机验证（验证码） schema。
 *
 * 此 schema 用于验证前端传递的验证码数据，通常用于登录、评论等操作，以防止机器人攻击。
 * 它定义了一个包含 `captcha` 对象的结构，该对象内部有两个字段：
 * - `ticket`: 由验证码服务生成的用户操作凭证。
 * - `randstr`: 验证票据需要的随机字符串。
 */
export const CaptchaSchema = z.object({
  captcha: z.object({
    randstr: z.string().min(1).max(500),
    ticket: z.string().min(1).max(500),
  }),
});
