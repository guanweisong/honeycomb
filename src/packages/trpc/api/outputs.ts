import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "./app-router";

export type CategoryEntity = inferProcedureOutput<
  AppRouter["category"]["index"]
>["list"][number];

export type CommentListResponse = inferProcedureOutput<
  AppRouter["comment"]["index"]
>;
export type CommentEntity = CommentListResponse["list"][number];
export type CommentTreeResponse = inferProcedureOutput<
  AppRouter["comment"]["listByRef"]
>;
export type CommentTreeEntity = CommentTreeResponse["list"][number];

export type LinkEntity = inferProcedureOutput<
  AppRouter["link"]["index"]
>["list"][number];
export type MediaEntity = inferProcedureOutput<
  AppRouter["media"]["index"]
>["list"][number];
export type MenuEntity = inferProcedureOutput<
  AppRouter["menu"]["index"]
>["list"][number];
export type PageEntity = inferProcedureOutput<
  AppRouter["page"]["index"]
>["list"][number];
export type PostListItemEntity = inferProcedureOutput<
  AppRouter["post"]["index"]
>["list"][number];
export type PostDetailEntity = inferProcedureOutput<AppRouter["post"]["detail"]>;
export type SettingEntity = inferProcedureOutput<AppRouter["setting"]["index"]>;
export type TagEntity = inferProcedureOutput<
  AppRouter["tag"]["index"]
>["list"][number];
export type UserEntity = inferProcedureOutput<
  AppRouter["user"]["index"]
>["list"][number];
