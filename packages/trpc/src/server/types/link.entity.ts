import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server/appRouter";

export type LinkEntity = inferProcedureOutput<
  AppRouter["link"]["index"]
>["list"][number];
