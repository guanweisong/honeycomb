import type { LinkInsertSchema } from "@/features/link/schema/link.insert.schema";
import type { z } from "zod";

export type LinkInsert = z.output<typeof LinkInsertSchema>;
