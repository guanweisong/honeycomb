import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/server/appRouter";

export type CategoryEntity = inferProcedureOutput<
  AppRouter["category"]["index"]
>["list"][number];
