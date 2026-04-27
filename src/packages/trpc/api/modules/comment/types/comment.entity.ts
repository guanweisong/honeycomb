import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type CommentListResponse = inferProcedureOutput<
  AppRouter["comment"]["index"]
>;

export type CommentEntity = CommentListResponse["list"][number];

export type CommentTreeResponse = inferProcedureOutput<
  AppRouter["comment"]["listByRef"]
>;

export type CommentTreeEntity = CommentTreeResponse["list"][number];
