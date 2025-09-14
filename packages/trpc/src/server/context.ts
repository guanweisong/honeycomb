import { db, schema } from "@honeycomb/db";
import { eq } from "drizzle-orm";

// 最小 User 类型，仅满足本项目上下文使用（id 与 level）
export interface User {
  id: string;
  level: string; // "ADMIN" | "EDITOR" | "GUEST"
  name?: string | null;
}

interface CreateContextOptions {
  req?: Request;
}

async function getUserFromRequest(req?: Request): Promise<User | null> {
  if (!req) return null as any;
  const token = req.headers.get("x-auth-token");
  if (!token) return null as any;

  const tokenInfo = await db.tables.token.select({
    whereExpr: eq(schema.token.content, token),
    limit: 1,
  });
  if (!tokenInfo.length) return null as any;

  const users = await db.tables.user.select({
    whereExpr: eq(schema.user.id, tokenInfo[0].userId!),
    limit: 1,
  });
  if (!users.length) return null;
  const u = users[0] as any;
  return { id: u.id, level: u.level, name: u.name } as User;
}

export const createContext = async (opts: CreateContextOptions) => {
  const user = await getUserFromRequest(opts.req);
  return {
    db,
    user,
  } as const;
};

export type Context = Awaited<ReturnType<typeof createContext>>;
