import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server";

export type MenuEntity = inferProcedureOutput<
  AppRouter["menu"]["index"]
>["list"][number];
