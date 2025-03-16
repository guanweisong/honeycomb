import { z } from "zod";
import { NameSchema } from "@/app/link/schemas/fields/name.schema";
import { DescriptionSchema } from "@/app/link/schemas/fields/description.schema";
import { StatusSchema } from "@/app/link/schemas/fields/status.schema";
import { UrlSchema } from "@/schemas/fields/url.schema";

export const LinkCreateSchema = z.object({
  name: NameSchema,
  url: UrlSchema,
  logo: UrlSchema,
  description: DescriptionSchema,
  status: StatusSchema.optional(),
});
