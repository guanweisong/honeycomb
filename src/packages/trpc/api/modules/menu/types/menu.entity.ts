import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type MenuEntity = inferProcedureOutput<
  AppRouter["menu"]["index"]
>["list"][number];
