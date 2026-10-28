import { describe, expect, it } from "vitest";

import { LinkInsertSchema } from "@/features/link/schemas/link.insert.schema";
import { CategoryInsertSchema } from "@/features/category/schemas/category.insert.schema";

import { cacheNamespaceValues } from "@/lib/cache/cache-namespaces";
import { metricLabelValueCatalog } from "@/lib/observability/core/metric-label-values";

describe("唯一写入契约及边界行为", () => {
  it.each([
    [
      "link",
      LinkInsertSchema,
      {
        url: "https://example.test",
        name: "Example",
        logo: "https://example.test/logo.png",
        status: "BROKEN",
      },
    ],
    [
      "category",
      CategoryInsertSchema,
      {
        title: { en: "Category", zh: "分类" },
        description: { en: "Description", zh: "描述" },
        path: "category",
        status: "BROKEN",
      },
    ],
  ])("%s 状态写入契约拒绝未知值", (_name, schema, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });
  it("指标 namespace 白名单引用缓存目录", () => {
    for (const namespace of cacheNamespaceValues)
      expect(metricLabelValueCatalog.namespace.has(namespace)).toBe(true);
    expect(metricLabelValueCatalog.namespace.has("unregistered-cache")).toBe(
      false,
    );
  });
});
