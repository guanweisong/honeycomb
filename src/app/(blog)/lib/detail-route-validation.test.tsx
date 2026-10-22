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
  const { notFound } = await importOriginal<typeof import("next/navigation")>();
  return { notFound };
});
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/app/lib/server/public-queries", () => ({
  getPublicPostDetail: (...args: unknown[]) => mockPostDetail(...args),
  getPublicPageDetail: (...args: unknown[]) => mockPageDetail(...args),
  getPublicSetting: (...args: unknown[]) => mockSetting(...args),
  getPublicComments: (...args: unknown[]) => mockComments(...args),
  getPublicRandomPosts: vi.fn(),
  getPublicLinks: vi.fn(),
}));
vi.mock("@/features/post/public/PostInfo", () => ({
  default: () => null,
  PostCommentCount: () => null,
}));
vi.mock("@/features/post/public/Tags", () => ({ default: () => null }));
vi.mock("@/features/post/public/PostViewTracker", () => ({
  PostViewTracker: () => null,
}));
vi.mock("@/features/page/public/PageViewTracker", () => ({
  PageViewTracker: () => null,
}));
vi.mock("@/features/comment/public/components/CommentClient", () => ({
  default: () => null,
}));
vi.mock("@/features/media/public/RichText", () => ({ RichText: () => null }));
vi.mock("@/lib/i18n/blog-navigation", () => ({ Link: () => null }));

import Archives, {
  generateMetadata as generateArchiveMetadata,
} from "@/app/(blog)/[locale]/archives/[id]/page";
import Pages, {
  generateMetadata as generatePageMetadata,
} from "@/app/(blog)/[locale]/pages/[id]/page";

const validId = "111111111111111111111111";
const routeProps = (id: string) => ({
  params: Promise.resolve({ id, locale: "en" }),
  searchParams: Promise.resolve({}),
});

const entryPoints = [
  {
    name: "archive content",
    query: mockPostDetail,
    invoke: (id: string) => {
      const content = Archives(routeProps(id)).props.children[1].props.children;
      return content.type(content.props);
    },
  },
  {
    name: "archive metadata",
    query: mockPostDetail,
    invoke: (id: string) => generateArchiveMetadata(routeProps(id)),
  },
  {
    name: "page content",
    query: mockPageDetail,
    invoke: (id: string) => {
      const content = Pages(routeProps(id)).props.children[1].props.children;
      return content.type(content.props);
    },
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
    expect(query).toHaveBeenCalledWith(validId);
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
      expect(query).toHaveBeenCalledWith(id);
    },
  );
});
