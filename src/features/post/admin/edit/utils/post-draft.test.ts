import { describe, expect, it } from "vitest";
import { parsePostDraft } from "@/features/post/admin/edit/utils/post-draft";

describe("post draft validation", () => {
  it("preserves unfinished bilingual input without persisting API or permission fields", () => {
    expect(
      parsePostDraft({
        title: { zh: " 未完成 ", en: "" },
        categoryId: "",
        id: "server",
        status: "published",
        session: "secret",
      }),
    ).toEqual({ title: { zh: " 未完成 ", en: "" }, categoryId: "" });
  });
  it("rejects invalid known field shapes", () => {
    expect(parsePostDraft({ title: { zh: 7 } })).toBeNull();
    expect(parsePostDraft(null)).toBeNull();
  });
});

it("retains staged tag options and the edit baseline in recoverable drafts", () => {
  const draft = {
    movieActors: [{ id: "actor", name: { zh: "演员", en: "Actor" } }],
    baseVersion: 7,
  };
  expect(parsePostDraft(draft)).toEqual(draft);
});
