import { describe, expect, it } from "vitest";
import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";
import { PostInsertSchema as OwnedPostSchema } from "@/features/post/application/write-schema";
import { PageInsertSchema } from "@/features/page/schemas/page.insert.schema";
import { PageInsertSchema as OwnedPageSchema } from "@/features/page/application/write-schema";
import { MediaInsertSchema } from "@/features/media/schemas/media.insert.schema";
import { MediaInsertSchema as OwnedMediaSchema } from "@/features/media/application/write-schema";
import { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import { LinkInsertSchema as OwnedLinkSchema } from "@/features/link/application/write-schema";
import { CategoryInsertSchema } from "@/features/category/application/write-schema";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { routing } from "@/packages/ui/navigation/routing";
import { PaginationQuerySchema } from "@/packages/trpc/api/schemas/pagination.query.schema";
import { cacheNamespaceValues } from "@/packages/infrastructure/cache/cache-namespaces";
import { metricLabelValueCatalog } from "@/packages/infrastructure/observability/core/metric-label-values";

describe("唯一写入契约及边界行为", () => {
  it.each([
    [PostInsertSchema, OwnedPostSchema],
    [PageInsertSchema, OwnedPageSchema],
    [MediaInsertSchema, OwnedMediaSchema],
    [LinkInsertSchema, OwnedLinkSchema],
  ])("传输出口引用同一 schema 实例，不建立平行规则", (transport, owner) => {
    expect(transport).toBe(owner);
  });

  it("文章保留可空局部语言并规范化分类 ID", () => {
    expect(
      PostInsertSchema.parse({
        categoryId: " category ",
        title: { en: null },
        coverId: null,
      }),
    ).toEqual({ categoryId: "category", title: { en: null }, coverId: null });
    expect(PostInsertSchema.safeParse({ categoryId: " " }).success).toBe(false);
  });

  it("页面完整语言仍必填且拒绝空文本", () => {
    expect(
      PageInsertSchema.safeParse({
        template: "default",
        title: { en: "About" },
        content: { en: "Content", zh: "内容" },
      }).success,
    ).toBe(false);
    expect(
      PageInsertSchema.safeParse({
        template: "default",
        title: { en: " ", zh: "关于" },
        content: { en: "Content", zh: "内容" },
      }).success,
    ).toBe(false);
  });

  it("媒体尺寸可空但大小仍要求非负整数", () => {
    expect(
      MediaInsertSchema.parse({
        name: " image.png ",
        size: 0,
        type: " image/png ",
        key: " key ",
        width: null,
      }),
    ).toEqual({
      name: "image.png",
      size: 0,
      type: "image/png",
      key: "key",
      width: null,
    });
    expect(
      MediaInsertSchema.safeParse({
        name: "image",
        size: -1,
        type: "image/png",
        key: "key",
      }).success,
    ).toBe(false);
  });

  it.each([
    [
      LinkInsertSchema,
      {
        url: "https://example.test",
        name: "Example",
        logo: "https://example.test/logo.png",
        status: "BROKEN",
      },
    ],
    [
      CategoryInsertSchema,
      {
        title: { en: "Category", zh: "分类" },
        description: { en: "Description", zh: "描述" },
        path: "category",
        status: "BROKEN",
      },
    ],
  ])("状态写入契约拒绝未知值", (schema, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });

  it("状态写入契约保留 EnableStatus 字面量", () => {
    expect(
      LinkInsertSchema.parse({
        url: "https://example.test",
        name: "Example",
        logo: "https://example.test/logo.png",
        status: EnableStatus.ENABLE,
      }).status,
    ).toBe(EnableStatus.ENABLE);
  });

  it("保留 API 排序默认与路由语言顺序", () => {
    expect(PaginationQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortField: "updatedAt",
      sortOrder: "desc",
    });
    expect(routing.locales).toEqual(["en", "zh"]);
  });

  it("指标 namespace 白名单引用缓存目录", () => {
    for (const namespace of cacheNamespaceValues)
      expect(metricLabelValueCatalog.namespace.has(namespace)).toBe(true);
    expect(metricLabelValueCatalog.namespace.has("unregistered-cache")).toBe(
      false,
    );
  });
});
