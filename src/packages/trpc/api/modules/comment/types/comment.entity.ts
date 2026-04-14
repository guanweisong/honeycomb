import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type CommentResponse = inferProcedureOutput<
  AppRouter["comment"]["index"]
>;

export type CommentEntity = CommentResponse["list"][number];
