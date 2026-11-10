import { z } from "zod";
import type { SocialProviderId } from "@/lib/auth/providers";

import { parseClientEnv } from "./client-schema";
import {
  type Environment,
  EnvironmentValidationError,
  parseSchema,
} from "./validation";

const requiredString = z.string().trim().min(1, "must not be empty");
const requiredUrl = z.url("must be a valid URL");
const minimumProductionAuthSecretLength = 32;
const r2AccountId = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{32}$/i, "must be a 32-character hexadecimal account ID");

const coreServerEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: requiredUrl,
  TURSO_URL: requiredUrl,
  TURSO_TOKEN: requiredString,
  AUTH_SECRET: requiredString,
  AUTH_URL: requiredUrl,
});

const databaseEnvSchema = coreServerEnvSchema.pick({
  TURSO_URL: true,
  TURSO_TOKEN: true,
});

const authEnvSchema = coreServerEnvSchema.pick({
  AUTH_SECRET: true,
  AUTH_URL: true,
});

function validateProductionAuthSecret(environment: Environment) {
  if (environment.NODE_ENV !== "production") return;

  const secret = environment.AUTH_SECRET?.trim() ?? "";
  const characterClasses = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(
    (pattern) => pattern.test(secret),
  ).length;

  if (
    secret.length < minimumProductionAuthSecretLength ||
    characterClasses < 3
  ) {
    throw new EnvironmentValidationError([
      `AUTH_SECRET: must be at least ${minimumProductionAuthSecretLength} characters and use at least three character classes in production`,
    ]);
  }
}

const oauthProviderSchema = z.object({
  clientId: requiredString,
  clientSecret: requiredString,
});

export type OAuthProviderConfig = z.output<typeof oauthProviderSchema>;

const r2Schema = z.object({
  accountId: r2AccountId,
  accessKeyId: requiredString,
  secretAccessKey: requiredString,
  bucketName: requiredString,
});

const turnstileSchema = z.object({
  siteKey: requiredString,
  secretKey: requiredString,
});

const resendSchema = z.object({
  apiKey: requiredString,
  fromEmail: z.email("must be a valid email address"),
  adminEmail: z.email("must be a valid email address"),
});

const upstashSchema = z.object({
  url: requiredUrl,
  token: requiredString,
});

const trustedProxyEnvSchema = z.object({
  TRUSTED_PROXY_HOPS: z
    .string()
    .regex(/^(?:[0-9]|1[0-6])$/, "must be an integer from 0 through 16")
    .transform(Number)
    .optional(),
});

export function parseTrustedProxyEnv(environment: Environment) {
  return parseSchema(trustedProxyEnvSchema, environment);
}

function readOptionalIntegration<T extends z.ZodType>(
  environment: Environment,
  variables: Record<string, string>,
  schema: T,
): z.output<T> | undefined {
  const names = Object.values(variables);
  const missing = names.filter((name) => environment[name] === undefined);
  if (missing.length === names.length) return undefined;
  if (missing.length) {
    throw new EnvironmentValidationError(
      missing.map(
        (variable) =>
          `${variable}: is required when this integration is enabled`,
      ),
    );
  }

  return parseSchema(
    schema,
    Object.fromEntries(
      Object.entries(variables).map(([field, name]) => [
        field,
        environment[name],
      ]),
    ),
  );
}

function readOAuthProviders(
  environment: Environment,
  mode: "runtime" | "build",
) {
  function readProvider(idVariable: string, secretVariable: string) {
    if (mode === "build") {
      const result = oauthProviderSchema.safeParse({
        clientId: environment[idVariable],
        clientSecret: environment[secretVariable],
      });
      return result.success ? result.data : undefined;
    }
    return readOptionalIntegration(
      environment,
      { clientId: idVariable, clientSecret: secretVariable },
      oauthProviderSchema,
    );
  }

  return {
    apple: readProvider("AUTH_APPLE_ID", "AUTH_APPLE_SECRET"),
    google: readProvider("AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"),
    github: readProvider("AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"),
  } satisfies Record<SocialProviderId, OAuthProviderConfig | undefined>;
}

export function parseDatabaseEnv(environment: Environment) {
  return parseSchema(databaseEnvSchema, environment);
}

export function parseAuthEnv(environment: Environment) {
  validateProductionAuthSecret(environment);
  return {
    ...parseSchema(authEnvSchema, environment),
    ...readOAuthProviders(environment, "runtime"),
    turnstile: parseTurnstileEnv(environment),
  };
}

export function parseBuildAuthEnv(environment: Environment) {
  return {
    AUTH_SECRET: environment.AUTH_SECRET,
    AUTH_URL: environment.AUTH_URL,
    ...readOAuthProviders(environment, "build"),
    turnstile:
      environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      environment.TURNSTILE_SECRET_KEY
        ? { secretKey: environment.TURNSTILE_SECRET_KEY }
        : undefined,
  };
}

export function parseR2Env(environment: Environment) {
  return readOptionalIntegration(
    environment,
    {
      accountId: "R2_ACCOUNT_ID",
      accessKeyId: "R2_ACCESS_KEY_ID",
      secretAccessKey: "R2_SECRET_ACCESS_KEY",
      bucketName: "R2_BUCKET_NAME",
    },
    r2Schema,
  );
}

export function parseTurnstileEnv(environment: Environment) {
  return readOptionalIntegration(
    environment,
    {
      siteKey: "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      secretKey: "TURNSTILE_SECRET_KEY",
    },
    turnstileSchema,
  );
}

export function parseResendEnv(environment: Environment) {
  return readOptionalIntegration(
    environment,
    {
      apiKey: "RESEND_API_KEY",
      fromEmail: "RESEND_FROM_EMAIL",
      adminEmail: "ADMIN_EMAIL",
    },
    resendSchema,
  );
}

export function parseUpstashEnv(environment: Environment) {
  return readOptionalIntegration(
    environment,
    {
      url: "UPSTASH_REDIS_REST_URL",
      token: "UPSTASH_REDIS_REST_TOKEN",
    },
    upstashSchema,
  );
}

export function parseServerEnv(environment: Environment) {
  validateProductionAuthSecret(environment);
  return {
    ...parseClientEnv(environment),
    ...parseSchema(coreServerEnvSchema, environment),
    ...parseTrustedProxyEnv(environment),
    oauth: readOAuthProviders(environment, "runtime"),
    r2: parseR2Env(environment),
    turnstile: parseTurnstileEnv(environment),
    resend: parseResendEnv(environment),
    upstash: parseUpstashEnv(environment),
  };
}

export { EnvironmentValidationError };
