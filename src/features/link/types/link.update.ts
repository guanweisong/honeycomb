import type { LinkUpdateSchema } from "@/features/link/schemas/link.update.schema";
import type { z } from "zod";

export type LinkUpdate = z.output<typeof LinkUpdateSchema>;
