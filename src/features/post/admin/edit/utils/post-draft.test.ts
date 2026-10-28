import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parsePostDraft,
  writePostCreationAttempt,
  readPostCreationAttempt,
  clearPostCreationAttempt,
} from "@/features/post/admin/edit/utils/post-draft";

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

describe("post creation receipt storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });
  const token = "123e4567-e89b-42d3-a456-426614174000";
  const input = { creationToken: token, categoryId: "category" };
  it("keeps accounts and token ownership separate", () => {
    expect(writePostCreationAttempt("account:a", input)).toBe(true);
    expect(readPostCreationAttempt("account:b")).toBeNull();
    expect(
      clearPostCreationAttempt("account:a", "another-token"),
    ).toBeUndefined();
    expect(readPostCreationAttempt("account:a")).toMatchObject(input);
    expect(clearPostCreationAttempt("account:a", token)).toBeUndefined();
    expect(readPostCreationAttempt("account:a")).toBeNull();
  });
  it("keeps clearing best-effort void rather than promising verified absence", () => {
    expect(writePostCreationAttempt("account", input)).toBe(true);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {});
    expect(clearPostCreationAttempt("account", token)).toBeUndefined();
    expect(readPostCreationAttempt("account")).toMatchObject(input);
  });
  it("rejects malformed or schema-invalid persisted attempts", () => {
    const key = "honeycomb:draft:post:account:creation-attempt";
    localStorage.setItem(key, "broken");
    expect(readPostCreationAttempt("account")).toBeNull();
    localStorage.setItem(
      key,
      JSON.stringify({ ...input, creationToken: "invalid" }),
    );
    expect(readPostCreationAttempt("account")).toBeNull();
  });
});
