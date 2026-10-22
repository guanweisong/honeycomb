import type { LinkUpdateSchema } from "@/features/link/schema/link.update.schema";
import type { z } from "zod";

export type LinkUpdate = z.output<typeof LinkUpdateSchema>;
