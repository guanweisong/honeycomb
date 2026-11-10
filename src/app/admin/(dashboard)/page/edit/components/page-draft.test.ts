import { PageTemplate } from "@/features/page/types/page.template";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parsePageDraft,
  writePageCreationAttempt,
  readPageCreationAttempt,
  clearPageCreationAttempt,
} from "@/app/admin/(dashboard)/page/edit/components/page-draft";
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

describe("page creation receipt storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });
  const token = "123e4567-e89b-42d3-a456-426614174000";
  const input = {
    creationToken: token,
    title: { en: "About", zh: "关于" },
    content: { en: "Body", zh: "正文" },
    template: PageTemplate.DEFAULT,
  };
  it("keeps accounts and token ownership separate and verifies absence", () => {
    expect(writePageCreationAttempt("account:a", input)).toBe(true);
    expect(readPageCreationAttempt("account:b")).toBeNull();
    expect(clearPageCreationAttempt("account:a", "another-token")).toBe(false);
    expect(readPageCreationAttempt("account:a")).toMatchObject(input);
    expect(clearPageCreationAttempt("account:a", token)).toBe(true);
    expect(readPageCreationAttempt("account:a")).toBeNull();
  });
  it("refuses to abandon the attempt when removal does not persist", () => {
    expect(writePageCreationAttempt("account", input)).toBe(true);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {});
    expect(clearPageCreationAttempt("account", token)).toBe(false);
    expect(readPageCreationAttempt("account")).toMatchObject(input);
  });
  it("recovers each pre-opened tab's attempt after refresh and preserves legacy receipts", () => {
    const account = "account";
    const otherToken = "123e4567-e89b-42d3-a456-426614174001";
    const legacyToken = "123e4567-e89b-42d3-a456-426614174002";
    const other = { ...input, creationToken: otherToken };
    const legacy = { ...input, creationToken: legacyToken };
    const key = "honeycomb:draft:page:account:creation-attempt";
    localStorage.setItem(key, JSON.stringify(legacy));

    expect(writePageCreationAttempt(account, input)).toBe(true);
    const tabOne = sessionStorage.getItem(key);
    sessionStorage.clear();
    expect(writePageCreationAttempt(account, other)).toBe(true);
    expect(readPageCreationAttempt(account)).toMatchObject(other);

    expect(tabOne).toBe(token);
    sessionStorage.setItem(key, token);
    expect(readPageCreationAttempt(account)).toMatchObject(input);
    expect(readPageCreationAttempt(account, otherToken)).toMatchObject(other);
    expect(readPageCreationAttempt("another", otherToken)).toBeNull();
    clearPageCreationAttempt(account, token);
    expect(readPageCreationAttempt(account, token)).toBeNull();
    expect(readPageCreationAttempt(account, otherToken)).toMatchObject(other);
    expect(readPageCreationAttempt(account, legacyToken)).toMatchObject(legacy);
    clearPageCreationAttempt(account, otherToken);
    expect(readPageCreationAttempt(account)).toMatchObject(legacy);
  });
  it("rejects malformed or schema-invalid persisted attempts", () => {
    const key = "honeycomb:draft:page:account:creation-attempt";
    localStorage.setItem(key, "broken");
    expect(readPageCreationAttempt("account")).toBeNull();
    localStorage.setItem(
      key,
      JSON.stringify({ ...input, creationToken: "invalid" }),
    );
    expect(readPageCreationAttempt("account")).toBeNull();
  });
});
