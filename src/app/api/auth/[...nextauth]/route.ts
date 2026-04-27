import NextAuth from "next-auth";
import { authOptions } from "@/app/api/auth/options";

/**
 * NextAuth Route Handler。
 * 负责处理登录、登出、OAuth 回调与 session 查询等认证相关请求。
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
