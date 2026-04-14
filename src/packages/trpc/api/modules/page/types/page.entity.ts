import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type PageEntity = inferProcedureOutput<
  AppRouter["page"]["index"]
>["list"][number];
