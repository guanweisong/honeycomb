import { handlers } from "@/auth";

/**
 * NextAuth Route Handler。
 * 负责处理登录、登出、OAuth 回调与 session 查询等认证相关请求。
 */
export const { GET, POST } = handlers;
