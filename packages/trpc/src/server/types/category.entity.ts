import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server";

export type CategoryEntity = inferProcedureOutput<
  AppRouter["category"]["index"]
>["list"][number];
