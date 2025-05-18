import { z } from "zod";
import { IdSchema } from "../../schemas/fields/id.schema";
import { TypeSchema } from "./fields/type.schema";
import { PowerSchema } from "./fields/power.schema";

export const MenuUpdateSchema = z
  .object({
    id: IdSchema,
    type: TypeSchema,
    power: PowerSchema,
    parent: IdSchema.optional(),
  })
  .array();
