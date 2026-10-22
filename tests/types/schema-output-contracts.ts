import type { z } from "zod";
import type { LinkListQuerySchema } from "@/features/link/schema";
import type { LinkListQueryInput } from "@/features/link/types";
import type { MediaListQuerySchema } from "@/features/media/schema";
import type { MediaIndexInput } from "@/features/media/types";
import type { PageListQuerySchema } from "@/features/page/schema";
import type { PageListQueryInput } from "@/features/page/types";
import type { PostListQuerySchema } from "@/features/post/schema";
import type { PostListQueryInput } from "@/features/post/types";
import type {
  TagListQuerySchema,
  TagInsertSchema,
} from "@/features/tag/schema";
import type {
  TagListQueryInput,
  TagInsertInput,
  TagInsert,
} from "@/features/tag/types";
import type {
  UserInsertSchema,
  UserUpdateSchema,
  UserListQuerySchema,
} from "@/features/user/schema";
import type {
  UserInsert,
  UserUpdate,
  UserListQueryInput,
  LoginValues,
} from "@/features/user/types";
import type { CategoryInsertSchema } from "@/features/category/schema";
import type {
  CategoryInsertInput,
  CategoryInsert,
} from "@/features/category/types";
import type {
  CommentInsertInput,
  PublicCommentInput,
} from "@/features/comment/types";
import type { UserLevel, UserStatus } from "@/features/user/user";
import type { EnableStatus } from "@/lib/validation/enable-status";
import type { SortOrder } from "@/lib/validation/pagination";
import type { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import type { queryString } from "@/lib/validation/query.string.schema";

// Compile-only assertions: check-types includes this .ts file; Vitest does not.
// Expected shapes are test oracles, not a second production contract.
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? (<T>() => T extends Right ? 1 : 2) extends <T>() => T extends Left ? 1 : 2
      ? true
      : false
    : false;
type Expect<Condition extends true> = Condition;

type PaginationOutput = {
  page: number;
  limit: number;
  sortField: string;
  sortOrder: SortOrder.asc | SortOrder.desc;
};
type OptionalPagination = Partial<PaginationOutput>;
type ExpectedLink = OptionalPagination & {
  name?: string;
  url?: string;
  description?: string;
  status?: (EnableStatus.ENABLE | EnableStatus.DISABLE)[];
};
type ExpectedPage = OptionalPagination & {
  title?: string;
  content?: string;
  status?: string[];
};
type ExpectedPost = ExpectedPage & {
  type?: string[];
  categoryId?: string;
  tagId?: string;
  authorId?: string;
};
type ExpectedTag = OptionalPagination & {
  id?: string[];
  name?: string;
};
type ExpectedUserInsert = {
  name: string;
  email: string;
  status?: UserStatus;
  level?: UserLevel;
  password: string;
};
type ExpectedUserUpdate = Partial<ExpectedUserInsert> & { id: string };
type ExpectedUserList = OptionalPagination & {
  status?: string[];
  level?: string[];
  name?: string;
};
// Flatten intersections only in the independent expected shapes, not actual types.
type Shape<T> = { [Key in keyof T]: T[Key] };

export type BusinessOutputContracts = [
  Expect<Equal<LinkListQueryInput, Shape<ExpectedLink>>>,
  Expect<Equal<MediaIndexInput, OptionalPagination>>,
  Expect<Equal<PageListQueryInput, Shape<ExpectedPage>>>,
  Expect<Equal<PostListQueryInput, Shape<ExpectedPost>>>,
  Expect<Equal<TagListQueryInput, Shape<ExpectedTag>>>,
  Expect<Equal<UserInsert, ExpectedUserInsert>>,
  Expect<Equal<UserUpdate, Shape<ExpectedUserUpdate>>>,
  Expect<Equal<UserListQueryInput, Shape<ExpectedUserList>>>,
];

export type SchemaOutputAliases = [
  Expect<Equal<LinkListQueryInput, z.output<typeof LinkListQuerySchema>>>,
  Expect<Equal<MediaIndexInput, z.output<typeof MediaListQuerySchema>>>,
  Expect<Equal<PageListQueryInput, z.output<typeof PageListQuerySchema>>>,
  Expect<Equal<PostListQueryInput, z.output<typeof PostListQuerySchema>>>,
  Expect<Equal<TagListQueryInput, z.output<typeof TagListQuerySchema>>>,
  Expect<Equal<UserInsert, z.output<typeof UserInsertSchema>>>,
  Expect<Equal<UserUpdate, z.output<typeof UserUpdateSchema>>>,
  Expect<Equal<UserListQueryInput, z.output<typeof UserListQuerySchema>>>,
];

// Unwrap the optional wrapper to expose the real empty-string transform:
// input is a string, but parsing an empty string can produce undefined.
type QueryStringTransform = ReturnType<
  ReturnType<typeof queryString>["unwrap"]
>;
export type TransformAndDefaultContracts = [
  Expect<Equal<z.input<QueryStringTransform>, string>>,
  Expect<Equal<z.output<QueryStringTransform>, string | undefined>>,
  Expect<Equal<z.input<typeof PaginationQuerySchema>, OptionalPagination>>,
  Expect<Equal<z.output<typeof PaginationQuerySchema>, PaginationOutput>>,
  // Feature .partial() makes the defaulted pagination outputs optional again.
  Expect<Equal<z.output<typeof MediaListQuerySchema>, OptionalPagination>>,
  Expect<Equal<z.input<typeof MediaListQuerySchema>, OptionalPagination>>,
];

export type RejectInputAsDefaultedOutput = Expect<
  // @ts-expect-error Defaulted output requires page, unlike the raw input.
  Equal<
    z.input<typeof PaginationQuerySchema>,
    z.output<typeof PaginationQuerySchema>
  >
>;
export type RejectTransformAsIdentity = Expect<
  // @ts-expect-error An empty input string can transform to undefined.
  Equal<z.input<QueryStringTransform>, z.output<QueryStringTransform>>
>;

// Raw validated inserts and the wider internal command contract remain distinct.
export type RelocatedContractSemantics = [
  Expect<Equal<CategoryInsertInput, z.output<typeof CategoryInsertSchema>>>,
  Expect<Equal<CategoryInsert, CategoryInsertInput & { id?: string }>>,
  Expect<Equal<"id" extends keyof CategoryInsertInput ? true : false, false>>,
  Expect<Equal<TagInsertInput, z.output<typeof TagInsertSchema>>>,
  Expect<Equal<TagInsert, TagInsertInput & { id?: string }>>,
  Expect<Equal<"id" extends keyof TagInsertInput ? true : false, false>>,
  Expect<Equal<CommentInsertInput["captchaToken"], string | undefined>>,
  Expect<
    Equal<"captchaToken" extends keyof PublicCommentInput ? true : false, false>
  >,
  Expect<Equal<LoginValues, { name: string; password: string }>>,
];
