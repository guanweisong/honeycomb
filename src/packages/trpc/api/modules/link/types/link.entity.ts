import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type LinkEntity = inferProcedureOutput<
  AppRouter["link"]["index"]
>["list"][number];
