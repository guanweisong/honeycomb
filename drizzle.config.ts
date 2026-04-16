import type { Config } from 'drizzle-kit';

export default {
  schema: './src/packages/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_TOKEN,
  },
} satisfies Config;
