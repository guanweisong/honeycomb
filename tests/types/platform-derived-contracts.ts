import type { ComponentProps } from "react";
import type { AuditSeverity } from "../../scripts/audit-production-dependencies";
import type { getPostTitle } from "@/app/(blog)/[locale]/archives/[id]/page.utils";
import type { ServerClientOptions } from "@/app/_trpc/server";
import type { Select } from "@/components/Select";
import type { Sheet } from "@/components/Sheet";
import type { OAuthProviderConfig } from "@/env/schema";
import type { AuthProviderConfig } from "@/lib/auth/providers";
import type { DatabaseOperation } from "@/lib/observability/server/database-operation";
import type {
  ExternalService,
  ExternalServiceOperation,
} from "@/lib/observability/server/external-service-operation";
import type { RequestContext } from "@/lib/observability/server/request-context";
import type { ApiRatelimit } from "@/lib/rate-limit/rate-limit";
import type { sanitizeOptionalI18nHtml } from "@/lib/security/sanitize-html";
import type { SecurityHeaderEnvironment } from "@/lib/security/security-headers";
import type { RateLimitedPublicProcedureOptions } from "@/lib/trpc/rate-limited-procedure";
import type { PaginationInput } from "@/lib/validation/pagination";

// Compile-only independent oracles. These must also pass with
// exactOptionalPropertyTypes=true: optional must not silently add undefined.
export type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? (<T>() => T extends Right ? 1 : 2) extends <T>() => T extends Left ? 1 : 2
      ? true
      : false
    : false;
export type Expect<Condition extends true> = Condition;
export type Shape<T> = { [Key in keyof T]: T[Key] };
export type Assignable<Source, Target> = [Source] extends [Target]
  ? true
  : false;

type ExpectedLocalizedInput = { en?: string | null; zh?: string | null };
type ExpectedOptionalI18nInput = ExpectedLocalizedInput | null | undefined;
type ExpectedI18n = { en: string; zh: string };
type ExpectedPostPresentation = {
  // The original tolerant presentation boundary accepts unknown strings.
  type: string;
  title?: ExpectedLocalizedInput | null;
  quoteContent?: ExpectedLocalizedInput | null;
  movieTime?: string | null;
  cover?: { url: string } | null;
  excerpt?: ExpectedLocalizedInput | null;
};
type ExpectedPaginationInput = {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
};
type ExpectedServerClientOptions = {
  requestContext?: RequestContext;
  skipRequestObservability?: boolean;
};
type ExpectedRateLimitedOptions = {
  limiter: ApiRatelimit;
  namespace: string;
  fallbackLimit?: number;
  timeoutMs?: number;
};
export type ExpectedAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
};

type PostPresentation = Parameters<typeof getPostTitle>[0];
type OptionalI18nInput = Parameters<typeof sanitizeOptionalI18nHtml>[0];

export type PlatformDerivedContracts = [
  Expect<Equal<AuditSeverity, "low" | "moderate" | "high" | "critical">>,
  Expect<Equal<Shape<PostPresentation>, ExpectedPostPresentation>>,
  Expect<Assignable<PostPresentation, ExpectedPostPresentation>>,
  Expect<Assignable<ExpectedPostPresentation, PostPresentation>>,
  Expect<Equal<ServerClientOptions, ExpectedServerClientOptions>>,
  Expect<
    Equal<
      Pick<ComponentProps<typeof Select>, "size">,
      { size?: "default" | "sm" }
    >
  >,
  Expect<
    Equal<
      Pick<ComponentProps<typeof Sheet>, "side">,
      { side?: "top" | "right" | "bottom" | "left" }
    >
  >,
  Expect<Equal<AuthProviderConfig, ExpectedAuthProviderConfig>>,
  Expect<Equal<OAuthProviderConfig, ExpectedAuthProviderConfig>>,
  Expect<
    Equal<
      DatabaseOperation,
      "select" | "insert" | "update" | "delete" | "transaction"
    >
  >,
  Expect<Equal<ExternalService, "captcha" | "email" | "object-storage">>,
  Expect<
    Equal<
      ExternalServiceOperation,
      "validate" | "send" | "put" | "presign" | "delete"
    >
  >,
  Expect<Equal<OptionalI18nInput, ExpectedOptionalI18nInput>>,
  Expect<
    Equal<
      typeof sanitizeOptionalI18nHtml,
      {
        (value: ExpectedLocalizedInput): ExpectedI18n;
        (value: ExpectedOptionalI18nInput): ExpectedI18n | null | undefined;
      }
    >
  >,
  Expect<Equal<SecurityHeaderEnvironment, Record<string, string | undefined>>>,
  Expect<
    Equal<Shape<RateLimitedPublicProcedureOptions>, ExpectedRateLimitedOptions>
  >,
  Expect<
    Assignable<RateLimitedPublicProcedureOptions, ExpectedRateLimitedOptions>
  >,
  Expect<
    Assignable<ExpectedRateLimitedOptions, RateLimitedPublicProcedureOptions>
  >,
  Expect<Equal<Shape<PaginationInput>, ExpectedPaginationInput>>,
  Expect<Assignable<PaginationInput, ExpectedPaginationInput>>,
  Expect<Assignable<ExpectedPaginationInput, PaginationInput>>,
];

// DetailFixture is intentionally narrower than its former open unknown index:
// only real detail fields are admitted and nested relations use minimal shapes.
// Its literal type strings, optional category, and explicit undefined values for
// omission/failure cases are retained. Private declarations are checked in-place
// by the compiler verification harness, not exported merely for testing.
export type OriginalDetailFixture = Record<string, unknown> & {
  category?: { id: string };
  id: string;
  type: "ARTICLE" | "MOVIE" | "PHOTOGRAPH" | "QUOTE";
};
type ExpectedDetailLocalized = {
  en?: string | undefined;
  zh?: string | undefined;
} | null;
export type ExpectedDetailFixtureProjection = {
  id: string;
  type: "ARTICLE" | "MOVIE" | "PHOTOGRAPH" | "QUOTE";
  category?: { id: string };
  author?: { name: string | null };
  cover?: { url: string };
  authorId?: string | undefined;
  createdAt?: string | null | undefined;
  title?: ExpectedDetailLocalized | undefined;
  content?: ExpectedDetailLocalized | undefined;
  excerpt?: ExpectedDetailLocalized | undefined;
  quoteAuthor?: ExpectedDetailLocalized | undefined;
  quoteContent?: ExpectedDetailLocalized | undefined;
  galleryLocation?: ExpectedDetailLocalized | undefined;
  galleryTime?: string | null | undefined;
  movieTime?: string | null | undefined;
  views?: number | null | undefined;
};
export type ExpectedDetailFixtureKeys =
  | "id"
  | "authorId"
  | "version"
  | "categoryId"
  | "title"
  | "content"
  | "excerpt"
  | "status"
  | "type"
  | "commentStatus"
  | "coverId"
  | "quoteAuthor"
  | "quoteContent"
  | "movieTime"
  | "galleryLocation"
  | "galleryTime"
  | "views"
  | "createdAt"
  | "updatedAt"
  | "category"
  | "author"
  | "cover"
  | "movieActors"
  | "movieDirectors"
  | "movieStyles"
  | "galleryStyles"
  | "imagesInContent";
export type ExpectedActionBranchFact = { name: string; value: boolean };
