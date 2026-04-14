import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type UserEntity = inferProcedureOutput<
  AppRouter["user"]["index"]
>["list"][number];
