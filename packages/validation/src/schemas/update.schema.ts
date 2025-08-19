import { z } from "zod";

export const UpdateSchema = (type: z.ZodTypeAny) =>
  z.object({
    id: z.string(),
    data: type,
  });
