import { describe, expect, it } from "vitest";
import {
  I18nSchema as DomainI18n,
  PartialLocalizedTextSchema,
  NullableLocalizedInputSchema,
} from "@/lib/i18n/i18n";
import { I18nSchema as InputI18n } from "@/lib/validation/validation";
import { MediaRecordSchema } from "@/features/media/schemas/media.record.schema";
import { TagRecordSchema } from "@/features/tag/schemas/tag.record.schema";
import { PostWithRelationsSchema } from "@/features/post/schemas/post.read-model.schema";
import { PostListResultSchema } from "@/features/post/schemas/post.read-model.schema";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import { DeleteBatchSchema } from "@/lib/validation/delete.batch.schema";
import { EnableStatus } from "@/lib/validation/enable-status";

const OptionalI18nSchema = NullableLocalizedInputSchema.optional();

describe("共享契约的真实消费者", () => {
  it("批量删除拒绝空 ID 集合", () => {
    const id = "123456789012345678901234";
    expect(DeleteBatchSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(DeleteBatchSchema.parse({ ids: [id] })).toEqual({
      ids: [id],
    });
  });

  it.each([
    { en: " English ", zh: " 中文 " },
    { en: "", zh: "中文" },
    { zh: "中文" },
    { en: 1, zh: "中文" },
    null,
  ])("完整语言输入与领域规则一致 (%#)", (value) => {
    const domain = DomainI18n.safeParse(value);
    const input = InputI18n.safeParse(value);
    expect(input.success).toBe(domain.success);
    if (domain.success && input.success)
      expect(input.data).toEqual(domain.data);
  });

  it("边界仅定制文案，并保留部分语言与可空输入差异", () => {
    const invalid = InputI18n.safeParse({ en: "", zh: "中文" });
    expect(invalid.error?.issues[0]?.message).toBe("英文不能为空");
    expect(PartialLocalizedTextSchema.parse({ zh: " " })).toEqual({ zh: " " });
    expect(PartialLocalizedTextSchema.safeParse({ zh: null }).success).toBe(
      false,
    );
    expect(NullableLocalizedInputSchema.parse({ zh: null })).toEqual({
      zh: null,
    });
    expect(OptionalI18nSchema.parse(undefined)).toBeUndefined();
  });

  it("文章关联实际复用媒体和标签 schema，而非复制结构", () => {
    expect(PostWithRelationsSchema.shape.cover.unwrap().unwrap()).toBe(
      MediaRecordSchema,
    );
    expect(PostWithRelationsSchema.shape.movieActors.element).toBe(
      TagRecordSchema,
    );
    expect(PostWithRelationsSchema.shape.movieDirectors.element).toBe(
      TagRecordSchema,
    );
    expect(PostWithRelationsSchema.shape.movieStyles.element).toBe(
      TagRecordSchema,
    );
    expect(PostWithRelationsSchema.shape.galleryStyles.element).toBe(
      TagRecordSchema,
    );
  });

  it("缓存序列化往返不丢失可选关联、空值和媒体字段", () => {
    const tag = {
      id: "tag",
      name: { en: "Tag", zh: "标签" },
      createdAt: null,
      updatedAt: null,
    };
    const post = createPostFixture({
      cover: {
        id: "cover",
        key: "key",
        name: "photo",
        size: 2,
        type: "image/png",
        url: "https://assets.test/photo.png",
        color: null,
        height: 10,
        width: null,
        createdAt: null,
        updatedAt: null,
      },
      category: {
        id: "category",
        title: { zh: "分类" },
        description: null,
        parent: null,
        status: EnableStatus.ENABLE,
        path: "category",
        createdAt: null,
        updatedAt: null,
      },
      author: {
        id: "author",
        name: null,
      },
      movieActors: [tag],
      movieDirectors: [tag],
      movieStyles: [tag],
      galleryStyles: [tag],
    });
    const original = { list: [post], total: 1 };
    const restored = PostListResultSchema.parse(
      JSON.parse(JSON.stringify(original)),
    );
    const expected = { ...post };
    Reflect.deleteProperty(expected, "creationToken");
    Reflect.deleteProperty(expected, "creationInputHash");
    expect(restored).toEqual({ list: [expected], total: 1 });
    expect(restored.list[0]).not.toHaveProperty("creationToken");
    expect(restored.list[0]).not.toHaveProperty("creationInputHash");
  });
});
