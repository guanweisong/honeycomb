// @vitest-environment node

import { describe, expect, it } from "vitest";
import { MultiLangEnum, normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";

describe("domain contracts", () => {
  it("preserves stable localization values", () => {
    expect(Object.values(MultiLangEnum)).toEqual(["zh", "en"]);
  });
  it("normalizes external locale strings to a supported language key", () => {
    expect(normalizeMultiLangLocale("zh")).toBe(MultiLangEnum.Zh);
    expect(normalizeMultiLangLocale("en")).toBe(MultiLangEnum.En);
    expect(normalizeMultiLangLocale("unsupported")).toBe(MultiLangEnum.En);
  });
});
