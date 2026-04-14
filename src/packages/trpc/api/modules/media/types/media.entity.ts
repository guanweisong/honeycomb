import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type MediaEntity = inferProcedureOutput<
  AppRouter["media"]["index"]
>["list"][number];
