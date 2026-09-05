import { z } from "zod";

const sessionListSchema = z.array(
  z.object({
    id: z.string(),
    createdAt: z.union([z.date(), z.string()]),
    expiresAt: z.union([z.date(), z.string()]),
    ipAddress: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
  }),
);

export function parseSessionList(value: unknown) {
  return sessionListSchema.parse(value);
}
