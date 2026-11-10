import "server-only";

import { betterAuth } from "better-auth/minimal";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { captcha, username } from "better-auth/plugins";
import { getAuthEnv } from "@/env/server";
import { getDb } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { getPasskeyConfig } from "@/lib/auth/passkey-config";
import { AUTH_CLIENT_IP_HEADER } from "@/lib/http/client-ip.server";
import { safeAuthLogger } from "@/lib/auth/safe-auth-logger";
import {
  getConfiguredProviderIds,
  SOCIAL_PROVIDER_IDS,
} from "@/lib/auth/providers";
import { passwordSignInPaths } from "@/app/auth/authentication-events";
import {
  createAuthDatabaseHooks,
  hideDisabledAccountSession,
  rejectDisabledAccountSession,
} from "@/app/auth/auth-hooks";
import {
  CREDENTIAL_PASSWORD_MAX_LENGTH,
  CREDENTIAL_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/auth/username-policy";

const authEnv = getAuthEnv();
const authBaseURL = authEnv.AUTH_URL;
if (!authBaseURL && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_URL is required in production");
}

function buildPlugins(): NonNullable<BetterAuthOptions["plugins"]> {
  const plugins: NonNullable<BetterAuthOptions["plugins"]> = [
    username({
      minUsernameLength: USERNAME_MIN_LENGTH,
      maxUsernameLength: USERNAME_MAX_LENGTH,
      usernameNormalization: false,
      usernameValidator: (value) => value.trim().length > 0,
    }),
    passkey(getPasskeyConfig(authBaseURL || "http://localhost:3000")),
  ];

  if (authEnv.turnstile) {
    plugins.push(
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: authEnv.turnstile.secretKey,
        endpoints: passwordSignInPaths,
      }),
    );
  }

  return plugins;
}

const authOptions: BetterAuthOptions = {
  logger: safeAuthLogger,
  baseURL: authBaseURL || "http://localhost:3000",
  secret: authEnv.AUTH_SECRET,
  advanced: { ipAddress: { ipAddressHeaders: [AUTH_CLIENT_IP_HEADER] } },
  disabledPaths: ["/update-user"],
  database:
    process.env.TURSO_URL && process.env.TURSO_TOKEN
      ? drizzleAdapter(getDb(), {
          provider: "sqlite",
          schema,
          transaction: true,
        })
      : undefined,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: CREDENTIAL_PASSWORD_MIN_LENGTH,
    maxPasswordLength: CREDENTIAL_PASSWORD_MAX_LENGTH,
  },
  session: {
    // 当前后台将登录会话列表视为普通的已登录用户信息，不要求重新认证。
    freshAge: 0,
  },
  socialProviders: Object.fromEntries(
    getConfiguredProviderIds(authEnv).map((id) => [id, authEnv[id]]),
  ),
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
      trustedProviders: [...SOCIAL_PROVIDER_IDS],
      requireLocalEmailVerified: false,
    },
  },
  plugins: buildPlugins(),
  hooks: {
    before: rejectDisabledAccountSession,
    after: hideDisabledAccountSession,
  },
  databaseHooks: createAuthDatabaseHooks(),
};

export const auth = betterAuth(authOptions);
