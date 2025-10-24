import { inferProcedureOutput } from "@trpc/server";
import { appRouter } from "@honeycomb/trpc/server/appRouter";

export type LinkEntity = inferProcedureOutput<
  AppRouter["link"]["index"]
>["list"][number];
