import { z } from "zod";
import { IdSchema } from "@/lib/validation/id.schema";
import {
  PostFieldsSchema,
  PostRelationPatchSchema,
  PostVersionSchema,
} from "./post.fields.schema";

export const PostUpdateSchema = PostFieldsSchema.partial()
  .extend(PostRelationPatchSchema.shape)
  .extend({
    id: IdSchema,
    expectedVersion: PostVersionSchema,
    removeLocales: z
      .array(z.enum(["en", "zh"]))
      .max(2)
      .refine(
        (locales) => new Set(locales).size === locales.length,
        "删除语言不能重复",
      )
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      (value.removeLocales ?? []).every((locale) =>
        [
          value.title,
          value.content,
          value.excerpt,
          value.quoteAuthor,
          value.quoteContent,
          value.galleryLocation,
        ].every(
          (field) =>
            field !== null &&
            (field === undefined || !Object.hasOwn(field, locale)),
        ),
      ),
    "不能同时修改和删除同一语言",
  )
  .refine(
    (value) =>
      Object.entries(value).some(
        ([key, field]) =>
          key !== "id" && key !== "expectedVersion" && field !== undefined,
      ),
    "至少修改一个字段",
  );
