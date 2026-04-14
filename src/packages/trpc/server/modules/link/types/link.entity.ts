import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/server/appRouter";

export type LinkEntity = inferProcedureOutput<
  AppRouter["link"]["index"]
>["list"][number];
