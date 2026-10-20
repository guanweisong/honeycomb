import { z } from "zod";

/** 可持久化到公共链接中的 HTTP(S) 地址；无框架或传输层依赖。 */
export const HttpUrlSchema = z
  .string()
  .trim()
  .pipe(
    z.url({
      protocol: /^https?$/,
      message: "网址必须使用有效的 http 或 https 地址",
    }),
  );
