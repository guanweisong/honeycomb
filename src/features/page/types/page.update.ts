import type { z } from "zod";
import type { PageUpdateSchema } from "../schemas/page.update.schema";

export type PageUpdate = z.output<typeof PageUpdateSchema>;
