import { inferProcedureOutput } from "@trpc/server";
import { appRouter } from "@honeycomb/trpc/server/appRouter";

export type CommentResponse = inferProcedureOutput<
  AppRouter["comment"]["index"]
>;

export type CommentEntity = CommentResponse["list"][number];
