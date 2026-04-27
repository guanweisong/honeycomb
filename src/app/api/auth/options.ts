import { getDb } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import { validateCaptcha } from "@/packages/trpc/api/utils/validateCaptcha";
import { and, eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import { compare } from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { UserStatus } from "@/packages/trpc/api/modules/user/types/user.status";

type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  level: UserLevel;
};

/**
 * 规范化 OAuth 首次登录时生成的用户名。
 * - 去掉首尾空白
 * - 限制长度，避免超过数据库约束或 UI 显示异常
 *
 * @param {string} baseName - 原始用户名候选值。
 * @returns {string} 规范化后的用户名。
 */
function normalizeUserName(baseName: string) {
  return baseName.trim().slice(0, 32) || "user";
}

/**
 * 基于基础用户名和重试次数生成用户名候选值。
 * 前几次重试使用简单的 `_n` 后缀，后续再拼接时间戳降低碰撞概率。
 *
 * @param {string} baseName - 基础用户名。
 * @param {number} attempt - 当前重试次数，从 0 开始。
 * @returns {string} 当前轮次的用户名候选值。
 */
function buildUserNameCandidate(baseName: string, attempt: number) {
  if (attempt === 0) {
    return baseName;
  }

  if (attempt < 10) {
    return `${baseName}_${attempt}`;
  }

  return `${baseName}_${Date.now()}_${attempt}`;
}

/**
 * 判断异常是否由唯一索引冲突引起。
 * 该判断用于 OAuth 首次建号时的重试逻辑。
 *
 * @param {unknown} error - 捕获到的异常对象。
 * @returns {boolean} 如果是唯一约束冲突则返回 true。
 */
function isUniqueConstraintError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown error");
  return /unique/i.test(message);
}

/**
 * 根据邮箱查找处于启用状态的用户。
 * 仅启用用户允许复用现有账号完成 OAuth 登录。
 *
 * @param {string} email - OAuth 返回的邮箱地址。
 * @returns {Promise<(typeof schema.user.$inferSelect) | null>} 匹配到的启用用户，或 null。
 */
async function findActiveUserByEmail(email: string) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (!user || user.status !== UserStatus.ENABLE) {
    return null;
  }

  return user;
}

/**
 * 为首次通过 OAuth 登录的用户创建本地账号。
 * 该函数会在用户名冲突时自动重试，直到成功生成唯一用户名。
 *
 * @param {{ email: string; name: string | null }} params - OAuth 返回的用户关键信息。
 * @returns {Promise<typeof schema.user.$inferSelect>} 创建成功后的用户记录。
 */
async function createOAuthUser(params: { email: string; name: string | null }) {
  const db = getDb();
  const baseName = normalizeUserName(params.name || params.email.split("@")[0]);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const [createdUser] = await db
        .insert(schema.user)
        .values({
          email: params.email,
          name: buildUserNameCandidate(baseName, attempt),
          level: UserLevel.GUEST,
          status: UserStatus.ENABLE,
        })
        .returning();

      return createdUser;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("无法为 OAuth 用户生成唯一用户名");
}

/**
 * 构建用户名密码 Provider。
 */
function buildCredentialsProvider() {
  return CredentialsProvider({
    name: "用户名密码",
    credentials: {
      name: { label: "用户名", type: "text" },
      password: { label: "密码", type: "password" },
      captchaToken: { label: "Captcha Token", type: "text" },
    },
    /**
     * 用户名密码登录授权逻辑。
     * 该流程会校验验证码、验证用户状态，并使用 bcrypt 校验密码哈希。
     *
     * @param {Record<string, string> | undefined} credentials - 登录表单提交的凭据。
     * @returns {Promise<AuthUser | null>} 登录成功时返回会话用户，失败时返回 null。
     */
    async authorize(credentials): Promise<AuthUser | null> {
      const name = credentials?.name?.trim();
      const password = credentials?.password;
      const captchaToken = credentials?.captchaToken;

      if (!name || !password || !captchaToken) {
        return null;
      }

      await validateCaptcha(captchaToken);

      const db = getDb();
      const [user] = await db
        .select()
        .from(schema.user)
        .where(
          and(eq(schema.user.name, name), eq(schema.user.status, UserStatus.ENABLE)),
        )
        .limit(1);

      if (!user?.password) {
        return null;
      }

      const passwordMatched = await compare(password, user.password);

      if (!passwordMatched) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level,
      };
    },
  });
}

/**
 * 构建当前环境启用的 OAuth Provider 列表。
 */
function buildOAuthProviders() {
  const providers: NonNullable<NextAuthOptions["providers"]> = [];

  if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
    providers.push(
      AppleProvider({
        clientId: process.env.AUTH_APPLE_ID,
        clientSecret: process.env.AUTH_APPLE_SECRET,
      }),
    );
  }

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    );
  }

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      }),
    );
  }

  return providers;
}

/**
 * 处理 OAuth 登录用户与本地账号的绑定。
 */
async function syncOAuthUser(params: {
  user: { id?: string; name?: string | null; email?: string | null; level?: UserLevel };
  profile?: { email?: string | null };
}) {
  const email =
    params.user.email?.trim().toLowerCase() ||
    params.profile?.email?.trim().toLowerCase();

  if (!email) {
    return false;
  }

  const existingUser = await findActiveUserByEmail(email);

  if (existingUser) {
    params.user.id = existingUser.id;
    params.user.name = existingUser.name;
    params.user.level = existingUser.level;
    return true;
  }

  const createdUser = await createOAuthUser({
    email,
    name: params.user.name ?? null,
  });

  params.user.id = createdUser.id;
  params.user.name = createdUser.name;
  params.user.level = createdUser.level;
  return true;
}

/**
 * 当前站点启用的 NextAuth Provider 配置集合。
 * OAuth Provider 会在所需环境变量存在时注册；
 * 用户名密码登录始终通过 Credentials Provider 提供。
 */
const authProviders: NonNullable<NextAuthOptions["providers"]> = [
  ...buildOAuthProviders(),
  buildCredentialsProvider(),
];

/**
 * NextAuth 的站点级认证配置。
 * 负责统一配置：
 * - OAuth / Credentials Provider
 * - 登录页路由
 * - JWT Session
 * - OAuth 首登建号与本地用户绑定逻辑
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: authProviders,
  callbacks: {
    /**
     * 登录阶段回调。
     * - Credentials 登录直接放行，由 `authorize` 完成用户校验
     * - OAuth 登录按邮箱匹配现有用户
     * - 若未匹配到本地用户，则自动创建一条 GUEST 用户记录
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true;
      }

      return syncOAuthUser({ user, profile });
    },
    /**
     * JWT 回调。
     * 在用户完成登录时，把后续鉴权需要的关键信息写入 token。
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.level = user.level;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    /**
     * Session 回调。
     * 把自定义 token 字段同步到前端可读取的 session.user 上。
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.level = token.level ?? UserLevel.GUEST;
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? null;
      }
      return session;
    },
  },
};
