import { NextRequest } from "next/server";

/**
 * 从请求头中获取认证 Token。
 * @param {NextRequest} request - Next.js 请求对象。
 * @returns {string | null} 认证 Token 字符串或 null。
 */
export const getAuthToken = (request: NextRequest) => {
  return request.headers.get("x-auth-token");
};
