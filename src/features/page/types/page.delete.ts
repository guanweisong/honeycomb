import type { z } from "zod";
import type { PageDeleteSchema } from "../schemas/page.delete.schema";

export type PageDelete = z.output<typeof PageDeleteSchema>;
