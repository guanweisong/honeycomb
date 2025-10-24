import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server/appRouter";

export type PageEntity = inferProcedureOutput<
  AppRouter["page"]["index"]
>["list"][number];
