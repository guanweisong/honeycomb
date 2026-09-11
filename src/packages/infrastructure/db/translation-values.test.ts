import { describe, expect, it } from "vitest";
import { MultiLangEnum } from "@/packages/domain/localization/i18n";
import {
  assembleLocalizedField,
  assembleRequiredLocalizedField,
  hasTranslationValues,
} from "./translation-values";

describe("translation value mapping", () => {
  it("assembles only persisted language values", () => {
    const rows = [
      { locale: MultiLangEnum.En, title: null },
      { locale: MultiLangEnum.Zh, title: "标题" },
    ];

    expect(assembleLocalizedField(rows, ({ title }) => title)).toEqual({
      zh: "标题",
    });
  });

  it("uses null as the single representation for an absent field", () => {
    const rows = [
      { locale: MultiLangEnum.En, title: null },
      { locale: MultiLangEnum.Zh, title: null },
    ];

    expect(assembleLocalizedField(rows, ({ title }) => title)).toBeNull();
    expect(hasTranslationValues([null, undefined])).toBe(false);
    expect(hasTranslationValues([null, ""])).toBe(true);
  });

  it("returns a complete contract only when both required languages exist", () => {
    const complete = [
      { locale: MultiLangEnum.En, title: "Title" },
      { locale: MultiLangEnum.Zh, title: "标题" },
    ];
    expect(assembleRequiredLocalizedField(complete, ({ title }) => title)).toEqual({
      en: "Title",
      zh: "标题",
    });
    expect(
      assembleRequiredLocalizedField(complete.slice(1), ({ title }) => title),
    ).toBeNull();
  });
});
