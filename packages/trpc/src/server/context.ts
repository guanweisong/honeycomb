import * as schema from "@honeycomb/db/schema";
import { db } from "@honeycomb/db/db";
import { eq } from "drizzle-orm";

/**
 * 上下文中的用户信息接口。
 */
export interface User {
  id: string;
  level: string; // 用户等级: "ADMIN" | "EDITOR" | "GUEST"
  name?: string | null;
}

interface CreateContextOptions {
  req?: Request;
}

/**
 * 从请求中异步获取用户信息。
 * @param {Request} [req] - 来自客户端的 HTTP 请求对象。
 * @returns {Promise<User | null>} 如果验证成功，则返回用户信息对象；否则返回 null。
 *
 * 工作流程：
 * 1. 从请求头的 `x-auth-token` 字段中获取 token。
 * 2. 如果没有 token，返回 null。
 * 3. 在数据库的 `token` 表中查找该 token。
 * 4. 如果 token 不存在，返回 null。
 * 5. 使用 token 关联的 `userId` 在 `user` 表中查找用户。
 * 6. 如果用户不存在，返回 null。
 * 7. 返回一个包含用户核心信息（id, level, name）的对象。
 */
async function getUserFromRequest(req?: Request): Promise<User | null> {
  if (!req) return null;
  const token = req.headers.get("x-auth-token");
  if (!token) return null;

  const tokenInfo = await db
    .select()
    .from(schema.token)
    .where(eq(schema.token.content, token))
    .limit(1);
  if (!tokenInfo.length) return null;

  const users = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, tokenInfo[0].userId!))
    .limit(1);
  if (!users.length) return null;
  const u = users[0];
  return { id: u.id, level: u.level, name: u.name } as User;
}

/**
 * 创建 tRPC 请求的上下文 (Context)。
 * 此函数在每个 tRPC 请求到达时被调用。
 *
 * @param {CreateContextOptions} opts - 包含可选的请求对象 `req`。
 * @returns {Promise<Context>} 返回一个包含以下内容的上下文对象：
 *   - `db`: Drizzle ORM 数据库实例。
 *   - `user`: 从请求中解析出的用户信息，可能为 null。
 *   - `header`: 请求头对象。
 */
export const createContext = async (opts: CreateContextOptions) => {
  const user = await getUserFromRequest(opts.req);
  return {
    db,
    user,
    header: opts.req?.headers ?? new Headers(),
  } as const;
};

/**
 * tRPC 上下文的 TypeScript 类型。
 * 从 `createContext` 函数的返回值类型推断而来。
 */
export type Context = Awaited<ReturnType<typeof createContext>>;
