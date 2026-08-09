import "server-only";

import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { captcha, username } from "better-auth/plugins";
import { getAuthEnv } from "@/env/server";
import { getDb } from "@/packages/db/db";
import * as schema from "@/packages/db/schema";
import { eq } from "drizzle-orm";
import { getPasskeyConfig } from "@/packages/auth/passkey-config";

const authEnv = getAuthEnv();
const authBaseURL = authEnv.AUTH_URL || "http://localhost:3000";

function buildSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {};

  if (authEnv.google) providers.google = authEnv.google;
  if (authEnv.github) providers.github = authEnv.github;
  if (authEnv.apple) providers.apple = authEnv.apple;

  return providers;
}

function buildPlugins(): NonNullable<BetterAuthOptions["plugins"]> {
  const plugins: NonNullable<BetterAuthOptions["plugins"]> = [
    username({
      minUsernameLength: 1,
      maxUsernameLength: 32,
      usernameNormalization: false,
      usernameValidator: (value) => value.trim().length > 0,
    }),
    passkey(getPasskeyConfig(authBaseURL)),
  ];

  if (authEnv.turnstile) {
    plugins.push(
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: authEnv.turnstile.secretKey,
        endpoints: ["/sign-in/username"],
      }),
    );
  }

  return plugins;
}

const authOptions: BetterAuthOptions = {
  baseURL: authBaseURL,
  secret: authEnv.AUTH_SECRET,
  database:
    process.env.TURSO_URL && process.env.TURSO_TOKEN
      ? drizzleAdapter(getDb(), {
          provider: "sqlite",
          schema,
        })
      : undefined,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  socialProviders: buildSocialProviders(),
  user: {
    additionalFields: {
      level: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
      status: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
    },
  },
  account: {
    accountLinking: {
      trustedProviders: ["google", "github", "apple"],
      requireLocalEmailVerified: false,
    },
  },
  plugins: buildPlugins(),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const baseName =
            user.name?.trim().slice(0, 32) || user.email.split("@")[0] || "user";

          for (let attempt = 0; attempt < 20; attempt += 1) {
            const candidate =
              attempt === 0
                ? baseName
                : `${baseName.slice(0, Math.max(1, 32 - String(attempt).length - 1))}_${attempt}`;
            const [existing] = await getDb()
              .select({ id: schema.user.id })
              .from(schema.user)
              .where(eq(schema.user.name, candidate))
              .limit(1);

            if (!existing) return { data: { ...user, name: candidate } };
          }

          throw new Error("无法为 OAuth 用户生成唯一用户名");
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const [user] = await getDb()
            .select({ status: schema.user.status })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
            .limit(1);

          if (!user || user.status !== "ENABLE") {
            return false;
          }
        },
      },
    },
  },
};

export const auth = betterAuth(authOptions);

export type AuthSession = typeof auth.$Infer.Session;
