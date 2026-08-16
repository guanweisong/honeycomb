import "server-only";

import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { captcha, username } from "better-auth/plugins";
import { getAuthEnv } from "@/env/server";
import { getDb } from "@/packages/infrastructure/db/db";
import * as schema from "@/packages/infrastructure/db/schema";
import { getPasskeyConfig } from "@/packages/identity/auth/passkey-config";
import { createAuthDatabaseHooks } from "@/packages/identity/auth/server/auth-hooks";

const authEnv = getAuthEnv();
const authBaseURL = authEnv.AUTH_URL || "http://localhost:3000";

function buildSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> =
    {};

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
    minPasswordLength: 6,
  },
  session: {
    // 当前后台将登录会话列表视为普通的已登录用户信息，不要求重新认证。
    freshAge: 0,
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
      disableImplicitLinking: true,
      trustedProviders: ["google", "github", "apple"],
      requireLocalEmailVerified: false,
    },
  },
  plugins: buildPlugins(),
  databaseHooks: createAuthDatabaseHooks(),
};

export const auth = betterAuth(authOptions);

export type AuthSession = typeof auth.$Infer.Session;
