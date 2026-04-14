import { z } from "zod";

/**
 * A utility type to create a "clean" or "plain" object type from a Zod schema's inferred type.
 * It maps over the inferred type to produce a simple key-value structure,
 * which can improve type readability and editor performance by flattening complex Zod types.
 * @template T - A Zod schema type (`z.ZodTypeAny`).
 */
export type CleanZod<T extends z.ZodTypeAny> = {
  [K in keyof z.infer<T>]: z.infer<T>[K];
};
