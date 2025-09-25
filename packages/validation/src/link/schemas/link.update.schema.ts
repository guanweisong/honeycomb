import { createUpdateSchema } from "drizzle-zod";
import { link } from "@honeycomb/db/src/schema";

export const LinkUpdateSchema = createUpdateSchema(link)
  .pick({
    url: true,
    status: true,
    name: true,
    description: true,
    logo: true,
    id: true,
  })
  .required({ id: true });
