import NextAuth from "next-auth";
import { getDb } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import { validateCaptcha } from "@/packages/trpc/api/utils/validateCaptcha";
import { and, eq } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";
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

function normalizeUserName(baseName: string) {
  return baseName.trim().slice(0, 32) || "user";
}

function buildUserNameCandidate(baseName: string, attempt: number) {
  if (attempt === 0) return baseName;
  if (attempt < 10) return `${baseName}_${attempt}`;
  return `${baseName}_${Date.now()}_${attempt}`;
}

function isUniqueConstraintError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown error");
  return /unique/i.test(message);
}

async function findActiveUserByEmail(email: string) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (!user || user.status !== UserStatus.ENABLE) return null;
  return user;
}

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
      if (isUniqueConstraintError(error)) continue;
      throw error;
    }
  }

  throw new Error("无法为 OAuth 用户生成唯一用户名");
}

function buildCredentialsProvider() {
  return CredentialsProvider({
    name: "用户名密码",
    credentials: {
      name: { label: "用户名", type: "text" },
      password: { label: "密码", type: "password" },
      captchaToken: { label: "Captcha Token", type: "text" },
    },
    async authorize(
      credentials: Partial<Record<"name" | "password" | "captchaToken", unknown>>,
    ): Promise<AuthUser | null> {
      const name =
        typeof credentials.name === "string" ? credentials.name.trim() : "";
      const password =
        typeof credentials.password === "string"
          ? credentials.password.trim()
          : "";
      const captchaToken =
        typeof credentials.captchaToken === "string"
          ? credentials.captchaToken.trim()
          : "";

      if (!name || !password || !captchaToken) return null;

      await validateCaptcha(captchaToken);

      const db = getDb();
      const [user] = await db
        .select()
        .from(schema.user)
        .where(
          and(eq(schema.user.name, name), eq(schema.user.status, UserStatus.ENABLE)),
        )
        .limit(1);

      if (!user?.password) return null;

      const passwordMatched = await compare(password, user.password);
      if (!passwordMatched) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level,
      };
    },
  });
}

function buildOAuthProviders() {
  const providers: NonNullable<NextAuthConfig["providers"]> = [];

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

async function syncOAuthUser(params: {
  user: { id?: string; name?: string | null; email?: string | null; level?: UserLevel };
  profile?: { email?: string | null };
}) {
  const email =
    params.user.email?.trim().toLowerCase() ||
    params.profile?.email?.trim().toLowerCase();

  if (!email) return false;

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

const authProviders: NonNullable<NextAuthConfig["providers"]> = [
  ...buildOAuthProviders(),
  buildCredentialsProvider(),
];

export const authOptions: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: authProviders,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") return true;
      return syncOAuthUser({ user, profile });
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.level = user.level;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const tokenEmail = typeof token.email === "string" ? token.email : null;
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.level =
          (token.level as UserLevel | undefined) ?? UserLevel.GUEST;
        session.user.name = typeof token.name === "string" ? token.name : null;
        session.user.email = tokenEmail ?? "";
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
