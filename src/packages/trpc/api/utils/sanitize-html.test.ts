import { describe, expect, it } from "vitest";
import {
  sanitizeOptionalI18nHtml,
  sanitizeRichText,
} from "./sanitize-html";

describe("sanitizeRichText", () => {
  it("returns an empty string for nullish input", () => {
    expect(sanitizeRichText(null)).toBe("");
    expect(sanitizeRichText(undefined)).toBe("");
  });

  it("removes unsafe tags while preserving allowed markup", () => {
    const html = '<p>Hello<script>alert("x")</script><strong>world</strong></p>';

    expect(sanitizeRichText(html)).toBe("<p>Hello<strong>world</strong></p>");
  });
});

describe("sanitizeOptionalI18nHtml", () => {
  it("returns nullish input as-is", () => {
    expect(sanitizeOptionalI18nHtml(null)).toBeNull();
    expect(sanitizeOptionalI18nHtml(undefined)).toBeUndefined();
  });

  it("sanitizes each language field", () => {
    expect(
      sanitizeOptionalI18nHtml({
        en: '<div>Hi<script>alert("x")</script></div>',
        zh: '<div>你好<script>alert("x")</script></div>',
      }),
    ).toEqual({
      en: "<div>Hi</div>",
      zh: "<div>你好</div>",
    });
  });
});
