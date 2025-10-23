import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server";

export type UserEntity = inferProcedureOutput<
  AppRouter["user"]["index"]
>["list"][number];
