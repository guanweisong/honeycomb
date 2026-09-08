import { describe, expect, it } from "vitest";
import { createLocalizedAlternates } from "./metadata";
import { MultiLangEnum } from "@/packages/domain/localization/multi-lang";

describe("createLocalizedAlternates", () => {
  it("builds canonical and language alternates from a normalized path", () => {
    expect(
      createLocalizedAlternates(MultiLangEnum.En, "/archives/post%201"),
    ).toEqual({
      canonical: "/en/archives/post%201",
      languages: {
        en: "/en/archives/post%201",
        zh: "/zh/archives/post%201",
      },
    });
  });
});
