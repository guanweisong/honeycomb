import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server/appRouter";

export type UserEntity = inferProcedureOutput<
  AppRouter["user"]["index"]
>["list"][number];
