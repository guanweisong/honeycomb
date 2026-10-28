import { PageTemplate } from "@/features/page/types/page.template";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parsePageDraft,
  writePageCreationAttempt,
  readPageCreationAttempt,
  clearPageCreationAttempt,
} from "@/features/page/admin/edit/page-draft";
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
