import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/server/appRouter";

export type PageEntity = inferProcedureOutput<
  AppRouter["page"]["index"]
>["list"][number];
