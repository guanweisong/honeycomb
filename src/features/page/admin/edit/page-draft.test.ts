import { describe, expect, it } from "vitest";
import { parsePageDraft } from "./page-draft";
describe("page draft validation", () => {
  it("preserves incomplete language fields and strips noneditable properties", () => {
    expect(
      parsePageDraft({
        title: { zh: " 中文 ", en: "" },
        content: { zh: "" },
        id: "server",
        status: "published",
      }),
    ).toEqual({ title: { zh: " 中文 ", en: "" }, content: { zh: "" } });
  });
  it("rejects corrupt known values", () => {
    expect(parsePageDraft({ content: "bad" })).toBeNull();
  });
});

it("retains the editing version but strips creation credentials from drafts", () => {
  expect(
    parsePageDraft({
      baseVersion: 4,
      creationToken: "secret",
      title: { zh: "中" },
    }),
  ).toEqual({ baseVersion: 4, title: { zh: "中" } });
});
