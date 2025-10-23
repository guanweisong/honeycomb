import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server";

export type PageEntity = inferProcedureOutput<
  AppRouter["page"]["index"]
>["list"][number];
