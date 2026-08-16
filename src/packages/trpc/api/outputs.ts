import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "./app-router";
import type {
  CategoryViewModel,
  LinkViewModel,
  MediaViewModel,
  MenuViewModel,
  PageViewModel,
  PostDetailViewModel,
  PostListViewModel,
  SettingViewModel,
  TagViewModel,
  UserViewModel,
} from "@/packages/application/contracts";

export type CategoryEntity = CategoryViewModel;

export type CommentListResponse = inferProcedureOutput<
  AppRouter["comment"]["index"]
>;
export type CommentEntity = CommentListResponse["list"][number];
export type CommentTreeResponse = inferProcedureOutput<
  AppRouter["comment"]["listByRef"]
>;
export type CommentTreeEntity = CommentTreeResponse["list"][number];

export type LinkEntity = LinkViewModel;
export type MediaEntity = MediaViewModel;
export type MenuEntity = MenuViewModel;
export type PageEntity = PageViewModel;
export type PostListItemEntity = PostListViewModel;
export type PostDetailEntity = PostDetailViewModel;
export type SettingEntity = SettingViewModel;
export type TagEntity = TagViewModel;
export type UserEntity = UserViewModel;
