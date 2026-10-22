import type { z } from "zod";
import type { PageDeleteSchema } from "../schema/page.delete.schema";

export type PageDelete = z.output<typeof PageDeleteSchema>;
