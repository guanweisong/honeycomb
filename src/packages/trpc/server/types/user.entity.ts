import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/server/appRouter";

export type UserEntity = inferProcedureOutput<
  AppRouter["user"]["index"]
>["list"][number];
