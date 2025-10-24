import { inferProcedureOutput } from "@trpc/server";
import { appRouter } from "@honeycomb/trpc/server/appRouter";

export type MediaEntity = inferProcedureOutput<
  AppRouter["media"]["index"]
>["list"][number];
