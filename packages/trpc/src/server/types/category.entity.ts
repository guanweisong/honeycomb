import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server/appRouter";

export type CategoryEntity = inferProcedureOutput<
  AppRouter["category"]["index"]
>["list"][number];
