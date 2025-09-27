import { createSelectSchema } from "drizzle-zod";
import { setting } from "@honeycomb/db/src/schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

export const SettingEntitySchema = createSelectSchema(setting);

export type SettingEntity = CleanZod<typeof SettingEntitySchema>;
