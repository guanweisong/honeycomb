import { z } from "zod";
import { IdSchema } from "@/schemas/fields/id.schema";
import { TypeSchema } from "@/app/menu/schemas/fields/type.schema";
import { PowerSchema } from "@/app/menu/schemas/fields/power.schema";

export const MenuUpdateSchema = z
  .object({
    id: IdSchema,
    type: TypeSchema,
    power: PowerSchema,
    parent: IdSchema.optional(),
  })
  .array();
