import type { z } from "zod";
import type { PageUpdateSchema } from "@/features/page/schemas/page.update.schema";

export type PageUpdate = z.output<typeof PageUpdateSchema>;
