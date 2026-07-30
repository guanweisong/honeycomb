import { z } from "zod";

import { parseClientEnv } from "./client-schema";
import {
  type Environment,
  EnvironmentValidationError,
  parseSchema,
} from "./validation";

const requiredString = z.string().trim().min(1, "must not be empty");
const requiredUrl = z.url("must be a valid URL");
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

const authEnvSchema = coreServerEnvSchema.pick({ AUTH_SECRET: true });

const oauthProviderSchema = z.object({
  clientId: requiredString,
  clientSecret: requiredString,
});

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

function readOptionalIntegration<T extends z.ZodType>(
  environment: Environment,
  variables: readonly string[],
  values: Record<string, string | undefined>,
  schema: T,
): z.output<T> | undefined {
  const configured = variables.filter(
    (variable) => environment[variable] !== undefined,
  );
  if (configured.length === 0) return undefined;

  if (configured.length !== variables.length) {
    const missing = variables.filter(
      (variable) => environment[variable] === undefined,
    );
    throw new EnvironmentValidationError(
      missing.map(
        (variable) =>
          `${variable}: is required when this integration is enabled`,
      ),
    );
  }

  return parseSchema(schema, values);
}

function readOAuthProvider(
  environment: Environment,
  idVariable: string,
  secretVariable: string,
) {
  return readOptionalIntegration(
    environment,
    [idVariable, secretVariable],
    {
      clientId: environment[idVariable],
      clientSecret: environment[secretVariable],
    },
    oauthProviderSchema,
  );
}

export function parseDatabaseEnv(environment: Environment) {
  return parseSchema(databaseEnvSchema, environment);
}

export function parseAuthEnv(environment: Environment) {
  return {
    ...parseSchema(authEnvSchema, environment),
    apple: readOAuthProvider(environment, "AUTH_APPLE_ID", "AUTH_APPLE_SECRET"),
    google: readOAuthProvider(
      environment,
      "AUTH_GOOGLE_ID",
      "AUTH_GOOGLE_SECRET",
    ),
    github: readOAuthProvider(
      environment,
      "AUTH_GITHUB_ID",
      "AUTH_GITHUB_SECRET",
    ),
  };
}

export function parseBuildAuthEnv(environment: Environment) {
  const readBuildOAuthProvider = (
    idVariable: string,
    secretVariable: string,
  ) => {
    const clientId = environment[idVariable]?.trim();
    const clientSecret = environment[secretVariable]?.trim();
    return clientId && clientSecret ? { clientId, clientSecret } : undefined;
  };

  return {
    AUTH_SECRET: environment.AUTH_SECRET,
    apple: readBuildOAuthProvider("AUTH_APPLE_ID", "AUTH_APPLE_SECRET"),
    google: readBuildOAuthProvider("AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"),
    github: readBuildOAuthProvider("AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"),
  };
}

export function parseR2Env(environment: Environment) {
  return readOptionalIntegration(
    environment,
    [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ],
    {
      accountId: environment.R2_ACCOUNT_ID,
      accessKeyId: environment.R2_ACCESS_KEY_ID,
      secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
      bucketName: environment.R2_BUCKET_NAME,
    },
    r2Schema,
  );
}

export function parseTurnstileEnv(environment: Environment) {
  return readOptionalIntegration(
    environment,
    ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"],
    {
      siteKey: environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      secretKey: environment.TURNSTILE_SECRET_KEY,
    },
    turnstileSchema,
  );
}

export function parseResendEnv(environment: Environment) {
  return readOptionalIntegration(
    environment,
    ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "ADMIN_EMAIL"],
    {
      apiKey: environment.RESEND_API_KEY,
      fromEmail: environment.RESEND_FROM_EMAIL,
      adminEmail: environment.ADMIN_EMAIL,
    },
    resendSchema,
  );
}

export function parseUpstashEnv(environment: Environment) {
  return readOptionalIntegration(
    environment,
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    {
      url: environment.UPSTASH_REDIS_REST_URL,
      token: environment.UPSTASH_REDIS_REST_TOKEN,
    },
    upstashSchema,
  );
}

export function parseServerEnv(environment: Environment) {
  return {
    ...parseClientEnv(environment),
    ...parseSchema(coreServerEnvSchema, environment),
    oauth: {
      apple: readOAuthProvider(
        environment,
        "AUTH_APPLE_ID",
        "AUTH_APPLE_SECRET",
      ),
      google: readOAuthProvider(
        environment,
        "AUTH_GOOGLE_ID",
        "AUTH_GOOGLE_SECRET",
      ),
      github: readOAuthProvider(
        environment,
        "AUTH_GITHUB_ID",
        "AUTH_GITHUB_SECRET",
      ),
    },
    r2: parseR2Env(environment),
    turnstile: parseTurnstileEnv(environment),
    resend: parseResendEnv(environment),
    upstash: parseUpstashEnv(environment),
  };
}

export { EnvironmentValidationError };
