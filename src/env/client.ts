import { parseClientEnv } from "./client-schema";

export const clientEnv = parseClientEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_ASSET_URL: process.env.NEXT_PUBLIC_ASSET_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  NEXT_PUBLIC_GA_BLOG_ID: process.env.NEXT_PUBLIC_GA_BLOG_ID,
  NEXT_PUBLIC_GA_ADMIN_ID: process.env.NEXT_PUBLIC_GA_ADMIN_ID,
});
