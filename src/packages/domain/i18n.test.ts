import { describe, expect, it } from "vitest";
import { I18nSchema, NullableI18nSchema } from "./localization/i18n";

describe("I18n domain contract", () => {
  it("normalizes non-empty localized values", () => {
    expect(I18nSchema.parse({ en: " English ", zh: " 中文 " })).toEqual({
      en: "English",
      zh: "中文",
    });
  });

  it("rejects empty localized values", () => {
    expect(I18nSchema.safeParse({ en: " ", zh: "中文" }).success).toBe(
      false,
    );
  });

  it("accepts null for persisted nullable fields", () => {
    expect(NullableI18nSchema.parse(null)).toBeNull();
  });
});
