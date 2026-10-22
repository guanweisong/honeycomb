import type { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import type { z } from "zod";

export type LinkInsert = z.output<typeof LinkInsertSchema>;
