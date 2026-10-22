import type { z } from "zod";
import type { PageFieldsSchema } from "../schemas/page.fields.schema";
import type { PageInsertSchema } from "../schemas/page.insert.schema";

export type PageFields = z.output<typeof PageFieldsSchema>;

export type PageInsert = z.output<typeof PageInsertSchema>;
