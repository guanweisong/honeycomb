import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server";

export type PostEntity = inferProcedureOutput<
  AppRouter["post"]["index"]
>["list"][number];
