import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server/appRouter";

export type PostListItemEntity = inferProcedureOutput<
  AppRouter["post"]["index"]
>["list"][number];

export type PostDetailEntity = inferProcedureOutput<
  AppRouter["post"]["detail"]
>;
