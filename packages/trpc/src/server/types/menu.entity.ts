import { inferProcedureOutput } from "@trpc/server";
import { appRouter } from "@honeycomb/trpc/server/appRouter";

export type MenuEntity = inferProcedureOutput<
  AppRouter["menu"]["index"]
>["list"][number];
