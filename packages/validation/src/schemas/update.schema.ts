import { z } from "zod";

export const UpdateSchema = <T>(type: z.ZodType<T>) =>
  z.object({
    id: z.string(),
    data: type,
  });
