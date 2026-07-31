import { z } from "zod";

import { type Environment, parseSchema } from "./validation";

const optionalString = z.string().trim().min(1, "must not be empty").optional();
const optionalUrl = z.url("must be a valid URL").optional();

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_ASSET_URL: optionalUrl,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  NEXT_PUBLIC_GA_BLOG_ID: optionalString,
  NEXT_PUBLIC_GA_ADMIN_ID: optionalString,
});

export function parseClientEnv(environment: Environment) {
  return parseSchema(clientEnvSchema, environment);
}
