import { getDb } from "@/packages/db/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import * as schema from "@/packages/db/schema";
import { eq } from "drizzle-orm";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { UserStatus } from "@/packages/trpc/api/modules/user/types/user.status";

/**
 * 上下文中的用户信息接口。
 */
export interface User {
  id: string;
  level: UserLevel;
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
 * 1. 读取当前请求对应的 NextAuth session。
 * 2. 如果 session 中没有用户信息，返回 null。
 * 3. 根据 session.user.id 回库读取用户当前状态与权限等级。
 * 4. 仅当用户仍然处于启用状态时，返回可用于后续鉴权的用户对象。
 */
async function getUserFromRequest(req?: Request): Promise<User | null> {
  if (!req) return null;
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;

  if (!sessionUser?.id || !sessionUser.level) {
    return null;
  }

  const db = getDb();
  const [user] = await db
    .select({
      id: schema.user.id,
      level: schema.user.level,
      name: schema.user.name,
      status: schema.user.status,
    })
    .from(schema.user)
    .where(eq(schema.user.id, sessionUser.id))
    .limit(1);

  if (!user || user.status !== UserStatus.ENABLE) {
    return null;
  }

  return {
    id: user.id,
    level: user.level,
    name: user.name,
  };
}

/**
 * 创建 tRPC 请求的上下文 (Context)。
 * 此函数在每个 tRPC 请求到达时被调用。
 * 它会把数据库实例和当前请求对应的用户信息一起注入到 tRPC 上下文中。
 *
 * @param {CreateContextOptions} opts - 包含可选的请求对象 `req`。
 * @returns {Promise<Context>} 返回一个包含以下内容的上下文对象：
 *   - `db`: Drizzle ORM 数据库实例。
 *   - `user`: 从请求中解析出的用户信息，可能为 null。
 *   - `header`: 请求头对象。
 */
export const createContext = async (opts: CreateContextOptions) => {
  const user = await getUserFromRequest(opts.req);
  const db = getDb();
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
