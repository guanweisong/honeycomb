import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type TagEntity = inferProcedureOutput<
  AppRouter["tag"]["index"]
>["list"][number];
