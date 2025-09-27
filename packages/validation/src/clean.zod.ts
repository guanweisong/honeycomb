import { z } from "zod";

export type CleanZod<T extends z.ZodTypeAny> = {
  [K in keyof z.infer<T>]: z.infer<T>[K];
};
