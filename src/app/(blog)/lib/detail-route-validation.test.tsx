vi.mock("@/app/(blog)/components/ContentViewTracker", () => ({
  ContentViewTracker: () => null,
}));
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import { EnableStatus } from "@/lib/validation/enable-status";
import { createPostFixture } from "@tests/helpers/post-fixtures";

const mockPostDetail = vi.fn();
const mockPageDetail = vi.fn();
const mockSetting = vi.fn();
const mockComments = vi.fn();

vi.mock("next/navigation", async (importOriginal) => {
  const { notFound, unstable_rethrow } =
    await importOriginal<typeof import("next/navigation")>();
  return { notFound, unstable_rethrow };
});
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock("@/app/trpc/server", () => ({
  createServerClient: async () => ({
    comment: { listByRef: (...args: unknown[]) => mockComments(...args) },
    link: { index: vi.fn() },
    page: { detail: (...args: unknown[]) => mockPageDetail(...args) },
    post: {
      detail: (...args: unknown[]) => mockPostDetail(...args),
      getRandomByCategory: vi.fn(),
    },
    setting: { index: (...args: unknown[]) => mockSetting(...args) },
  }),
}));
vi.mock("@/app/(blog)/components/features/post/public/PostInfo", () => ({
  default: () => null,
  PostCommentCount: () => null,
}));
vi.mock("@/app/(blog)/components/features/post/public/Tags", () => ({
  default: () => null,
}));
vi.mock(
  "@/app/(blog)/components/features/comment/public/components/CommentClient",
  () => ({
    default: () => null,
  }),
);
vi.mock("@/app/(blog)/components/features/media/public/RichText", () => ({
  RichText: () => null,
}));
vi.mock("@/app/(blog)/lib/blog-navigation", () => ({ Link: () => null }));

import Archives, {
  generateMetadata as generateArchiveMetadata,
} from "@/app/(blog)/[locale]/archives/[id]/page";
import Pages, {
  generateMetadata as generatePageMetadata,
} from "@/app/(blog)/[locale]/pages/[id]/page";
import { loadOptionalPublicComments } from "@/app/(blog)/components/features/comment/public/PublicCommentSection";
import { MenuType } from "@/features/menu/types/menu.type";
import { notFound } from "next/navigation";

const validId = "111111111111111111111111";

it("passes framework interruptions through the optional comment read", async () => {
  mockComments.mockImplementationOnce(() => notFound());
  await expect(
    loadOptionalPublicComments(validId, MenuType.PAGE),
  ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});
const routeProps = (id: string) => ({
  params: Promise.resolve({ id, locale: "en" }),
  searchParams: Promise.resolve({}),
});

const entryPoints = [
  {
    name: "archive content",
    query: mockPostDetail,
    invoke: (id: string) => Archives(routeProps(id)),
  },
  {
    name: "archive metadata",
    query: mockPostDetail,
    invoke: (id: string) => generateArchiveMetadata(routeProps(id)),
  },
  {
    name: "page content",
    query: mockPageDetail,
    invoke: (id: string) => Pages(routeProps(id)),
  },
  {
    name: "page metadata",
    query: mockPageDetail,
    invoke: (id: string) => generatePageMetadata(routeProps(id)),
  },
];

describe.each(entryPoints)("$name route validation", ({ query, invoke }) => {
  beforeEach(() => {
    mockPostDetail.mockReset().mockResolvedValue(
      createPostFixture({
        id: validId,
        category: {
          id: "222222222222222222222222",
          title: null,
          description: null,
          parent: null,
          status: EnableStatus.ENABLE,
          path: "tech",
          createdAt: null,
          updatedAt: null,
        },
        title: { en: "Article", zh: "文章" },
      }),
    );
    mockPageDetail.mockReset().mockResolvedValue({
      id: validId,
      status: PageStatus.PUBLISHED,
      template: PageTemplate.DEFAULT,
      title: { en: "Page", zh: "页面" },
    });
    mockSetting
      .mockReset()
      .mockResolvedValue({ siteName: { en: "Honeycomb" } });
    mockComments.mockReset().mockResolvedValue({ list: [], total: 0 });
  });

  it.each(["", "short", "1".repeat(23), "1".repeat(25)])(
    "rejects malformed ID %j before any public query",
    async (id) => {
      await expect(invoke(id)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      expect(mockPostDetail).not.toHaveBeenCalled();
      expect(mockPageDetail).not.toHaveBeenCalled();
      expect(mockSetting).not.toHaveBeenCalled();
      expect(mockComments).not.toHaveBeenCalled();
    },
  );

  it("uses notFound for a valid ID with no published detail", async () => {
    query.mockResolvedValue(null);

    await expect(invoke(validId)).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(query).toHaveBeenCalledWith({ id: validId });
    expect(mockComments).not.toHaveBeenCalled();
  });

  it.each([
    new TRPCError({ code: "BAD_REQUEST", message: "Non-ID validation failed" }),
    new Error("Database unavailable"),
  ])("preserves a real query failure: %s", async (error) => {
    query.mockRejectedValue(error);

    await expect(invoke(validId)).rejects.toBe(error);
    expect(mockComments).not.toHaveBeenCalled();
  });

  it.each([validId, "a".repeat(24), "%".repeat(24)])(
    "accepts the existing ID schema without inventing restrictions: %s",
    async (id) => {
      await expect(invoke(id)).resolves.toBeDefined();
      expect(query).toHaveBeenCalledWith({ id });
    },
  );
});
