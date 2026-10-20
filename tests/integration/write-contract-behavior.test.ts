import { describe, expect, it } from "vitest";
import { PostInsertSchema } from "@/features/post/schema";
import { PageInsertSchema } from "@/features/page/schema";
import { MediaUploadFileSchema } from "@/features/media/upload-policy";
import { LinkInsertSchema } from "@/features/link/schema";
import { CategoryInsertSchema } from "@/features/category/schema";
import { EnableStatus } from "@/lib/validation/enable-status";
import { routing } from "@/lib/i18n/routing";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";
import { cacheNamespaceValues } from "@/lib/cache/cache-namespaces";
import { metricLabelValueCatalog } from "@/lib/observability/core/metric-label-values";

describe("唯一写入契约及边界行为", () => {
  it("文章保留可空局部语言并规范化分类 ID", () => {
    expect(
      PostInsertSchema.parse({
        creationToken: "11111111-1111-4111-8111-111111111111",
        categoryId: " category ",
        title: { en: null },
        coverId: null,
      }),
    ).toEqual({
      creationToken: "11111111-1111-4111-8111-111111111111",
      categoryId: "category",
      title: { en: null },
      coverId: null,
    });
    expect(
      PostInsertSchema.safeParse({
        creationToken: "11111111-1111-4111-8111-111111111111",
        categoryId: " ",
      }).success,
    ).toBe(false);
  });

  it("页面完整语言仍必填且拒绝空文本", () => {
    expect(
      PageInsertSchema.safeParse({
        creationToken: "11111111-1111-4111-8111-111111111111",
        template: "default",
        title: { en: "About" },
        content: { en: "Content", zh: "内容" },
      }).success,
    ).toBe(false);
    expect(
      PageInsertSchema.safeParse({
        creationToken: "11111111-1111-4111-8111-111111111111",
        template: "default",
        title: { en: " ", zh: "关于" },
        content: { en: "Content", zh: "内容" },
      }).success,
    ).toBe(false);
  });

  it("媒体上传规范化文件字段且大小仍要求非负整数", () => {
    expect(
      MediaUploadFileSchema.parse({
        name: " image.png ",
        size: 0,
        type: " image/png ",
      }),
    ).toEqual({
      name: "image.png",
      size: 0,
      type: "image/png",
    });
    expect(
      MediaUploadFileSchema.safeParse({
        name: "image",
        size: -1,
        type: "image/png",
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
