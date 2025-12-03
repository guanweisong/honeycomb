import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    R2_ACCOUNT_ID: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_BUCKET_NAME: z.string(),
    JWT_EXPIRES: z.string(),
    JWT_SECRET: z.string(),
    CAPTCHA_AID: z.string(),
    CAPTCHA_APP_SECRET_KEY: z.string(),
    RESEND_API_KEY: z.string(),
    TURSO_URL: z.string(),
    TURSO_TOKEN: z.string(),
    LINK_OBJECT_ID: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    NEXT_PUBLIC_API_DOMAIN: z.string(),
  },
  runtimeEnv: {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    JWT_EXPIRES: process.env.JWT_EXPIRES,
    JWT_SECRET: process.env.JWT_SECRET,
    CAPTCHA_AID: process.env.CAPTCHA_AID,
    CAPTCHA_APP_SECRET_KEY: process.env.CAPTCHA_APP_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    TURSO_URL: process.env.TURSO_URL,
    TURSO_TOKEN: process.env.TURSO_TOKEN,
    LINK_OBJECT_ID: process.env.LINK_OBJECT_ID,
    NEXT_PUBLIC_API_DOMAIN: process.env.NEXT_PUBLIC_API_DOMAIN,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
