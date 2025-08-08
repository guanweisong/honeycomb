import { prisma } from "@honeycomb/db";
import { User } from "@prisma/client";

interface CreateContextOptions {
  req?: Request;
}

async function getUserFromRequest(req?: Request): Promise<User | null> {
  if (!req) return null;
  const token = req.headers.get("x-auth-token");
  if (!token) return null;
  const tokenInfo = await prisma.token.findUnique({
    where: { content: token },
  });
  if (!tokenInfo) return null;
  return prisma.user.findUnique({
    where: { id: tokenInfo.userId },
  });
}

export const createContext = async (opts: CreateContextOptions) => {
  const user = await getUserFromRequest(opts.req);
  return {
    prisma,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
