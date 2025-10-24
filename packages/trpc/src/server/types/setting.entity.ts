import { inferProcedureOutput } from "@trpc/server";
import { appRouter } from "@honeycomb/trpc/server/appRouter";

export type SettingEntity = inferProcedureOutput<
  AppRouter["setting"]["index"]
>["list"][number];
