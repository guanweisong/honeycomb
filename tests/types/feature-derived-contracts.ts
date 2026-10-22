import type { renderCategoryTitleByDepth } from "@/features/category/admin/category-title";
import type { CommentRequestMetadata } from "@/features/comment/types/comment.insert";
import type {
  NotificationComment,
  NotificationSetting,
} from "@/features/comment/types/comment.notification";
import type { CommentListInput } from "@/features/comment/types/comment.query";
import type { PublicCommentNode } from "@/features/comment/types/comment.read-model";
import type { CommentStatus } from "@/features/comment/types/comment.status";
import type { CommentTarget } from "@/features/comment/types/comment.target";
import type { MenuSaveResult } from "@/features/menu/admin/menu-actions";
import type {
  MenuEntityTree,
  MenuSelectableItem,
} from "@/features/menu/admin/menu-transforms";
import type { MenuType } from "@/features/menu/types/menu.type";
import type LoginClient from "@/features/user/login/components/LoginClient";
import type { CurrentUser } from "@/features/user/types/user.current";
import type { UserLevel } from "@/features/user/types/user.level";
import type {
  UserListInput,
  UserListQueryInput,
} from "@/features/user/types/user.list";

// Compile-only regression oracles, independent of the production derivations.
// The external compiler harness checks both exactOptionalPropertyTypes modes.
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? (<T>() => T extends Right ? 1 : 2) extends <T>() => T extends Left ? 1 : 2
      ? true
      : false
    : false;
type Expect<Condition extends true> = Condition;
type Shape<Value> = { [Key in keyof Value]: Value[Key] };
type Extends<Left, Right> = [Left] extends [Right] ? true : false;
type ExactOptional = { value: undefined } extends { value?: never }
  ? false
  : true;

type ExpectedLocalizedText = {
  en?: string | undefined;
  zh?: string | undefined;
};
type ExpectedPagination = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
};
type ExpectedCommentListInput = ExpectedPagination & {
  content?: string;
  status?: string[];
  email?: string;
  ip?: string;
  author?: string;
};
type ExpectedUserListInput = ExpectedPagination & {
  name?: string;
  email?: string;
  status?: string[];
  level?: string[];
};
type ExpectedNotificationComment = {
  id: string;
  author: string;
  content: string;
  site: string | null;
  email: string;
  parentId: string | null;
  postId: string | null;
  pageId: string | null;
  customId: string | null;
  status: CommentStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
  userAgent: string | null;
  ip: string | null;
  post: { id: string; title?: ExpectedLocalizedText | null } | null;
  page: { id: string; title?: ExpectedLocalizedText | null } | null;
};
type ExpectedPublicCommentNode = {
  id: string;
  author: string;
  content: string;
  site: string | null;
  parentId: string | null;
  status: CommentStatus | null;
  createdAt: string | null;
  avatar: string;
  children?: ExpectedPublicCommentNode[];
};
type ExpectedMenuTree = {
  id: string;
  parent: string | null;
  power: number;
  type: MenuType;
  createdAt: string | null;
  updatedAt: string | null;
  title?: ExpectedLocalizedText | string | null;
  path?: string | null;
  children?: ExpectedMenuTree[];
};
type ExpectedMenuSelectableItem = {
  id: string;
  title?: ExpectedLocalizedText | null;
  path?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
type ExpectedCurrentUser = {
  id: string;
  name?: string | null;
  level: UserLevel;
};
type ActualLoginProps = Parameters<typeof LoginClient>[0];
type ExpectedLoginProps = {
  setting: { siteName?: ExpectedLocalizedText | null } | undefined;
  providers: { id: "apple" | "google" | "github"; name: string }[];
  targetUrl?: string;
};

// Kept in the test only. The harness injects an assertion beside the private
// AccountItem declaration, without adding a production export for test access.
export type ExpectedAccountItem = {
  id: string;
  providerId: string;
  accountId: string;
};

export type FeatureDerivedContracts = [
  Expect<
    Equal<
      Parameters<typeof renderCategoryTitleByDepth>[1],
      { deepPath: number }
    >
  >,
  Expect<
    Equal<
      CommentRequestMetadata,
      { ip: string | null; userAgent: string | null }
    >
  >,
  Expect<Equal<Shape<NotificationComment>, ExpectedNotificationComment>>,
  Expect<
    Equal<NotificationSetting, { siteName: ExpectedLocalizedText | null }>
  >,
  Expect<Equal<Shape<CommentListInput>, Shape<ExpectedCommentListInput>>>,
  Expect<Equal<Shape<UserListInput>, Shape<ExpectedUserListInput>>>,
  Expect<Extends<PublicCommentNode, ExpectedPublicCommentNode>>,
  Expect<Extends<ExpectedPublicCommentNode, PublicCommentNode>>,
  Expect<Equal<keyof PublicCommentNode, keyof ExpectedPublicCommentNode>>,
  Expect<
    Equal<
      CommentTarget,
      {
        postId?: string | null;
        pageId?: string | null;
        customId?: string | null;
      }
    >
  >,
  Expect<Extends<MenuEntityTree, ExpectedMenuTree>>,
  Expect<Extends<ExpectedMenuTree, MenuEntityTree>>,
  Expect<Equal<keyof MenuEntityTree, keyof ExpectedMenuTree>>,
  Expect<Equal<MenuSelectableItem, ExpectedMenuSelectableItem>>,
  Expect<Equal<Shape<CurrentUser>, ExpectedCurrentUser>>,
  Expect<Equal<ActualLoginProps, ExpectedLoginProps>>,
];

// These two corrections intentionally reject previously accepted unsupported
// states/IDs; neither changes a parser, runtime object, or failure fallback.
export type IntentionalFeatureNarrowing = [
  Expect<
    Equal<
      MenuSaveResult,
      { count: number; version: number; publicSync?: "completed" | "degraded" }
    >
  >,
  Expect<
    Equal<
      ActualLoginProps["providers"][number]["id"],
      "apple" | "google" | "github"
    >
  >,
  Expect<
    Equal<
      Extends<
        { count: number; version: number; publicSync: "pending" },
        MenuSaveResult
      >,
      false
    >
  >,
  Expect<
    Equal<
      Extends<
        { id: "unknown-provider"; name: string },
        ActualLoginProps["providers"][number]
      >,
      false
    >
  >,
];

export type PreservedFeatureBoundaries = [
  Expect<Equal<Extends<{ status: ["other-status"] }, CommentListInput>, true>>,
  Expect<Equal<Extends<{ level: ["other-level"] }, UserListInput>, true>>,
  Expect<Equal<Extends<{ email: string }, UserListInput>, true>>,
  Expect<Equal<"email" extends keyof UserListQueryInput ? true : false, false>>,
  Expect<Equal<"email" extends keyof PublicCommentNode ? true : false, false>>,
  Expect<
    Equal<"custom" extends keyof NotificationComment ? true : false, false>
  >,
  Expect<Equal<Extends<{ postId: null }, CommentTarget>, true>>,
  Expect<Equal<Extends<Record<never, never>, CommentTarget>, true>>,
  Expect<
    Equal<
      Extends<{ page: undefined }, CommentListInput>,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<
    Equal<
      Extends<{ content: undefined }, CommentListInput>,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<
    Equal<
      Extends<{ name: undefined }, UserListInput>,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<
    Equal<
      Extends<{ email: undefined }, UserListInput>,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<
    Equal<
      Extends<{ postId: undefined }, CommentTarget>,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<
    Equal<
      Extends<{ id: string; level: UserLevel; name: undefined }, CurrentUser>,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<
    Equal<
      Extends<
        { siteName: undefined },
        NonNullable<ActualLoginProps["setting"]>
      >,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<
    Equal<
      Extends<{ title: undefined }, Pick<MenuEntityTree, "title">>,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<
    Equal<
      Extends<{ path: undefined }, Pick<MenuSelectableItem, "path">>,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<
    Equal<
      Extends<
        { count: number; version: number; publicSync: undefined },
        MenuSaveResult
      >,
      ExactOptional extends true ? false : true
    >
  >,
  Expect<Equal<Extends<{ id: string; level: "ADMIN" }, CurrentUser>, false>>,
  Expect<
    Equal<Extends<{ id: string; level: UserLevel.ADMIN }, CurrentUser>, true>
  >,
];
