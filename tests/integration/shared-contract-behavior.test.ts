import { describe, expect, it } from "vitest";
import { I18nSchema as DomainI18n } from "@/lib/i18n/i18n";
import { I18nSchema as InputI18n } from "@/lib/validation/validation";
import { MediaRecordSchema } from "@/features/media/schemas/media.record.schema";
import { TagRecordSchema } from "@/features/tag/schemas/tag.record.schema";
import { PostWithRelationsSchema } from "@/features/post/schemas/post.read-model.schema";

describe("共享契约的真实消费者", () => {
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
});
