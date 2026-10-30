import type { ComponentProps } from "react";
import type {
  submitMediaDelete,
  submitMediaUpload,
} from "@/app/admin/(dashboard)/media/media-actions";
import type {
  MediaDeleteInput,
  MediaDeleteResult,
} from "@/features/media/types/media.delete";
import type { MediaRegisterUploadInput } from "@/features/media/types/media.upload";
import type { MediaRecord } from "@/features/media/types/media.record";
import type { findKnownMediaReferences } from "@/features/media/server/media-references";
import type { PageEditorActionButtons } from "@/app/admin/(dashboard)/page/edit/components/PageEditorActionButtons";
import type { submitPageEditor } from "@/app/admin/(dashboard)/page/edit/page-editor-actions";
import type { PageInput } from "@/features/page/types/page.list-query";
import type { PageStatus } from "@/features/page/types/page.status";
import type { PostEditorActions } from "@/app/admin/(dashboard)/post/edit/components/PostEditorActions";
import type { PostListInput } from "@/features/post/types/post.list-query";
import type { PostStatus } from "@/features/post/types/post.status";
import type {
  PostAuthorRecord,
  PostCategoryRecord,
} from "@/features/post/types/post.read-model";
import type { TagListInput } from "@/features/tag/types/tag.list";
import type { TagRecord } from "@/features/tag/types/tag.record";
import type * as schema from "@/lib/db/schema";

// Compile-only independent oracles. No production schema or derived type is used
// to rebuild the expected fields. Check these with exact optional types on/off.
type Expect<Condition extends true> = Condition;
type Equivalent<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false;
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? (<T>() => T extends Right ? 1 : 2) extends <T>() => T extends Left ? 1 : 2
      ? true
      : false
    : false;

type ExpectedPagination = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
};
type ExpectedPageInput = ExpectedPagination & {
  title?: string;
  content?: string;
  status?: string[];
};
type ExpectedPostInput = ExpectedPagination & {
  status?: string[];
  type?: string[];
  categoryId?: string;
  tagId?: string;
  authorId?: string;
  title?: string;
  content?: string;
};
type ExpectedTagInput = ExpectedPagination & {
  id?: string[];
  name?: string;
};
type ExpectedUploadOptions = {
  files: readonly File[];
  isCurrent?: () => boolean;
  prepareUpload: (input: {
    name: string;
    type:
      "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "image/avif";
    size: number;
    sha256: string;
  }) => Promise<{ intent: string; uploadUrl: string; expiresAt: string }>;
  uploadToStorage: (url: string, file: File) => Promise<void>;
  registerUpload: (input: { intent: string }) => Promise<MediaRecord>;
};
type ExpectedDeleteInput = {
  ids: string[];
  acknowledgeUnknownReferences: true;
};
type ExpectedDeleteResult = {
  success: true;
  publicSync?: "completed" | "degraded";
};
type ExpectedSavedPage = {
  id: string;
  version: number;
  publicSync?: "completed" | "degraded";
};

// The two editor props intentionally narrow arbitrary strings to confirmed
// publication states. Their remaining properties retain the original contract.
type ExpectedPageActions = {
  isEdit: boolean;
  loading: boolean;
  status?: "PUBLISHED" | "DRAFT" | "TO_AUDIT";
  onSubmit: (status: PageStatus) => Promise<boolean>;
};
type ExpectedPostActions = {
  id?: string;
  loading: boolean;
  status?: "PUBLISHED" | "DRAFT" | "TO_AUDIT";
  submit: (status: PostStatus, action: "create" | "update") => Promise<boolean>;
};
type PageActions = ComponentProps<typeof PageEditorActionButtons>;
type PostActions = ComponentProps<typeof PostEditorActions>;
type UploadOptions = Parameters<typeof submitMediaUpload>[0];
type DeleteInput = Parameters<
  Parameters<typeof submitMediaDelete>[0]["destroy"]
>[0];
type SavedPage = Awaited<
  ReturnType<Parameters<typeof submitPageEditor>[0]["create"]>
>;
type UpdatedPage = Awaited<
  ReturnType<Parameters<typeof submitPageEditor>[0]["update"]>
>;

export type ContentDerivedContracts = [
  Expect<Equivalent<PageInput, ExpectedPageInput>>,
  Expect<Equivalent<PostListInput, ExpectedPostInput>>,
  Expect<Equivalent<TagListInput, ExpectedTagInput>>,
  Expect<Equal<UploadOptions, ExpectedUploadOptions>>,
  Expect<Equal<DeleteInput, ExpectedDeleteInput>>,
  Expect<Equal<MediaDeleteInput, ExpectedDeleteInput>>,
  Expect<Equal<MediaRegisterUploadInput, { intent: string }>>,
  Expect<Equal<MediaDeleteResult, ExpectedDeleteResult>>,
  Expect<Equivalent<SavedPage, ExpectedSavedPage>>,
  Expect<Equivalent<UpdatedPage, ExpectedSavedPage>>,
  Expect<
    Equal<
      Parameters<typeof findKnownMediaReferences>[1],
      readonly { id: string; key: string; url: string }[]
    >
  >,
  Expect<Equal<PageActions, ExpectedPageActions>>,
  Expect<Equal<PostActions, ExpectedPostActions>>,
  Expect<
    Equal<
      string extends NonNullable<PageActions["status"]> ? true : false,
      false
    >
  >,
  Expect<
    Equal<
      string extends NonNullable<PostActions["status"]> ? true : false,
      false
    >
  >,
  Expect<
    Equal<
      false extends DeleteInput["acknowledgeUnknownReferences"] ? true : false,
      false
    >
  >,
  Expect<
    Equal<
      "asc" extends NonNullable<PostListInput["sortOrder"]> ? true : false,
      true
    >
  >,
  Expect<
    Equal<
      "desc" extends NonNullable<PageInput["sortOrder"]> ? true : false,
      true
    >
  >,
];

// Oracles for scoped compiler inspection of private parameters. Keep those
// production helpers private instead of adding exports solely for tests.
export type ExpectedCreationIdentity = { id: string; version: number };
export type ExpectedPageBaseStatus = PageStatus | undefined;
export type ExpectedPostViewModelRelations = {
  category?: PostCategoryRecord | null;
  author?: PostAuthorRecord | null;
  cover?: typeof schema.media.$inferSelect | null;
  movieActors: TagRecord[];
  movieDirectors: TagRecord[];
  movieStyles: TagRecord[];
  galleryStyles: TagRecord[];
};
