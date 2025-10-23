import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server";

export type SettingEntity = inferProcedureOutput<
  AppRouter["setting"]["index"]
>["list"][number];
