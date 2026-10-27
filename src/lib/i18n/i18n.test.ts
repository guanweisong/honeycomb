// @vitest-environment node

import { describe, expect, it } from "vitest";
import { I18nSchema, NullableI18nSchema } from "./i18n";
import {
  PartialLocalizedTextSchema,
  NullableLocalizedInputSchema,
} from "@/lib/i18n/i18n";

describe("I18n domain contract", () => {
  it("normalizes non-empty localized values", () => {
    expect(I18nSchema.parse({ en: " English ", zh: " 中文 " })).toEqual({
      en: "English",
      zh: "中文",
    });
  });

  it("rejects empty localized values", () => {
    expect(I18nSchema.safeParse({ en: " ", zh: "中文" }).success).toBe(false);
  });

  it("accepts null for persisted nullable fields", () => {
    expect(NullableI18nSchema.parse(null)).toBeNull();
  });
});

describe("共享契约的真实消费者", () => {
  const OptionalI18nSchema = NullableLocalizedInputSchema.optional();
  it("保留部分语言与可空输入差异", () => {
    expect(PartialLocalizedTextSchema.parse({ zh: " " })).toEqual({ zh: " " });
    expect(PartialLocalizedTextSchema.safeParse({ zh: null }).success).toBe(
      false,
    );
    expect(NullableLocalizedInputSchema.parse({ zh: null })).toEqual({
      zh: null,
    });
    expect(OptionalI18nSchema.parse(undefined)).toBeUndefined();
  });
});
