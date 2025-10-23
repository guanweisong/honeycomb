import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server";

export type MediaEntity = inferProcedureOutput<
  AppRouter["media"]["index"]
>["list"][number];
