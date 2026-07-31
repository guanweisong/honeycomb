import { z } from "zod";

export type Environment = Record<string, string | undefined>;

export class EnvironmentValidationError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration: ${issues.join("; ")}`);
    this.name = "EnvironmentValidationError";
  }
}

export function parseSchema<T extends z.ZodType>(
  schema: T,
  environment: Environment,
): z.output<T> {
  const result = schema.safeParse(environment);
  if (result.success) return result.data;

  throw new EnvironmentValidationError(
    result.error.issues.map((issue) => {
      const key = issue.path.join(".") || "environment";
      return `${key}: ${issue.message}`;
    }),
  );
}
