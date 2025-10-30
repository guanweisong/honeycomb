import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server/appRouter";

export type TagEntity = inferProcedureOutput<
  AppRouter["tag"]["index"]
>["list"][number];
