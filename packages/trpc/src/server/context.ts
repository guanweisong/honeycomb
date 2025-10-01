import { db, schema } from "@honeycomb/db";
import { eq } from "drizzle-orm";

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

  const tokenInfo = await db
    .select()
    .from(schema.token)
    .where(eq(schema.token.content, token))
    .limit(1);
  if (!tokenInfo.length) return null as any;

  const users = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, tokenInfo[0].userId!))
    .limit(1);
  if (!users.length) return null;
  const u = users[0] as any;
  return { id: u.id, level: u.level, name: u.name } as User;
}

export const createContext = async (opts: CreateContextOptions) => {
  const user = await getUserFromRequest(opts.req);
  return {
    db,
    user,
    header: opts.req?.headers ?? new Headers(),
  } as const;
};

export type Context = Awaited<ReturnType<typeof createContext>>;
