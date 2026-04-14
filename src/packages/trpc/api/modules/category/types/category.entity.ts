import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type CategoryEntity = inferProcedureOutput<
  AppRouter["category"]["index"]
>["list"][number];
