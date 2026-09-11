import { describe, expect, it } from "vitest";
import { sanitizeOptionalI18nHtml, sanitizeRichText } from "./sanitize-html";

describe("sanitizeRichText", () => {
  it("protects new-tab rich-text links while preserving nofollow", () => {
    const document = new DOMParser().parseFromString(
      sanitizeRichText(
        '<a href="https://example.test" target="_blank" rel="nofollow opener">External</a>',
      ),
      "text/html",
    );
    const link = document.querySelector("a");
    expect(link?.rel.split(" ")).toEqual(
      expect.arrayContaining(["nofollow", "noopener", "noreferrer"]),
    );
    expect(link?.rel.split(" ")).not.toContain("opener");
  });
  it("returns an empty string for nullish input", () => {
    expect(sanitizeRichText(null)).toBe("");
    expect(sanitizeRichText(undefined)).toBe("");
  });

  it("removes unsafe tags while preserving allowed markup", () => {
    const html =
      '<p>Hello<script>alert("x")</script><strong>world</strong></p>';

    expect(sanitizeRichText(html)).toBe("<p>Hello<strong>world</strong></p>");
  });

  it.each([
    '<svg><animate href="javascript:alert(1)"></animate></svg>',
    '<a href="javascript:alert(1)" onclick="alert(2)">unsafe</a>',
    '<img src="data:text/html,<script>alert(1)</script>" onerror="alert(2)">',
    '<div __proto__="polluted" constructor="alert(1)">safe</div>',
  ])("removes executable markup from %s", (html) => {
    const sanitized = sanitizeRichText(html);

    expect(sanitized).not.toMatch(
      /(?:javascript:|data:text\/html|onerror|onclick|__proto__|constructor|<svg|<animate)/i,
    );
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
