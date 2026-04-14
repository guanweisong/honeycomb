import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/server/appRouter";

export type MenuEntity = inferProcedureOutput<
  AppRouter["menu"]["index"]
>["list"][number];
