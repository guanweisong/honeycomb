import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parsePostDraft,
  writePostCreationAttempt,
  readPostCreationAttempt,
  clearPostCreationAttempt,
} from "@/app/admin/(dashboard)/post/edit/components/utils/post-draft";

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
    sessionStorage.clear();
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
  it("recovers each pre-opened tab's attempt after refresh and preserves legacy receipts", () => {
    const account = "account";
    const otherToken = "123e4567-e89b-42d3-a456-426614174001";
    const legacyToken = "123e4567-e89b-42d3-a456-426614174002";
    const other = { ...input, creationToken: otherToken };
    const legacy = { ...input, creationToken: legacyToken };
    const key = "honeycomb:draft:post:account:creation-attempt";
    localStorage.setItem(key, JSON.stringify(legacy));

    expect(writePostCreationAttempt(account, input)).toBe(true);
    const tabOne = sessionStorage.getItem(key);
    sessionStorage.clear();
    expect(writePostCreationAttempt(account, other)).toBe(true);
    expect(readPostCreationAttempt(account)).toMatchObject(other);

    expect(tabOne).toBe(token);
    sessionStorage.setItem(key, token);
    expect(readPostCreationAttempt(account)).toMatchObject(input);
    expect(readPostCreationAttempt(account, otherToken)).toMatchObject(other);
    expect(readPostCreationAttempt("another", otherToken)).toBeNull();
    clearPostCreationAttempt(account, token);
    expect(readPostCreationAttempt(account, token)).toBeNull();
    expect(readPostCreationAttempt(account, otherToken)).toMatchObject(other);
    expect(readPostCreationAttempt(account, legacyToken)).toMatchObject(legacy);
    clearPostCreationAttempt(account, otherToken);
    expect(readPostCreationAttempt(account)).toMatchObject(legacy);
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
