import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Cors from "@/libs/cors";

/**
 * Next.js 服务端中间件。
 * 该中间件会在每个请求到达时执行，主要用于处理 CORS (跨域资源共享) 策略。
 *
 * @param {NextRequest} req - Next.js 的请求对象。
 * @returns {Promise<NextResponse>} 返回一个经过 CORS 处理的响应对象。
 *
 * @notice 安全警告：当前的 CORS `origin` 配置会允许任何来源的跨域请求。
 * 在生产环境中，为了安全起见，应该将其替换为一个严格的来源白名单。
 * @example
 * // 一个更安全的 origin 配置示例
 * origin: (origin, callback) => {
 *   const allowedOrigins = ["https://example.com", "https://www.example.com"];
 *   if (!origin || allowedOrigins.indexOf(origin) !== -1) {
 *     callback(null, true);
 *   } else {
 *     callback(new Error("Not allowed by CORS"));
 *   }
 * }
 */
export default async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  console.log("request", req.url, req.body);

  return Cors(req, res, {
    credentials: true,
    origin: (origin) => {
      return origin!;
    },
  });
}
