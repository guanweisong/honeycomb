// @vitest-environment node

import { describe, it, expect } from "vitest";
import { getAllImageLinkFromHtml, getLocalizedImageLinks } from "./image-links";

describe("image-links", () => {
  it("should return empty array for undefined html", () => {
    const result = getAllImageLinkFromHtml(undefined);
    expect(result).toEqual([]);
  });

  it("should return empty array for falsy html", () => {
    const result = getAllImageLinkFromHtml(undefined);
    expect(result).toEqual([]);
  });

  it("should return empty array for empty string", () => {
    const result = getAllImageLinkFromHtml("");
    expect(result).toEqual([]);
  });

  it("should extract single image link", () => {
    const html = '<img src="https://example.com/image.jpg" />';
    const result = getAllImageLinkFromHtml(html);
    expect(result).toEqual(["https://example.com/image.jpg"]);
  });

  it("should extract multiple image links", () => {
    const html = `
      <img src="https://example.com/image1.jpg" />
      <img src="https://example.com/image2.jpg" />
      <img src="https://example.com/image3.jpg" />
    `;
    const result = getAllImageLinkFromHtml(html);
    expect(result).toEqual([
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
    ]);
  });

  it("should handle images with additional attributes", () => {
    const html =
      '<img src="https://example.com/image.jpg" alt="test" width="100" />';
    const result = getAllImageLinkFromHtml(html);
    expect(result).toEqual(["https://example.com/image.jpg"]);
  });

  it("should handle images without src attribute", () => {
    const html = '<img alt="test" width="100" />';
    const result = getAllImageLinkFromHtml(html);
    expect(result).toEqual([]);
  });

  it("should handle mixed content with images", () => {
    const html = `
      <div>
        <p>Some text</p>
        <img src="https://example.com/image1.jpg" />
        <p>More text</p>
        <img src="https://example.com/image2.jpg" />
      </div>
    `;
    const result = getAllImageLinkFromHtml(html);
    expect(result).toEqual([
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
    ]);
  });

  it("should handle relative URLs", () => {
    const html = '<img src="/images/image.jpg" />';
    const result = getAllImageLinkFromHtml(html);
    expect(result).toEqual(["/images/image.jpg"]);
  });

  it("should handle data URLs", () => {
    const html = '<img src="data:image/png;base64,iVBORw0KG..." />';
    const result = getAllImageLinkFromHtml(html);
    expect(result).toEqual(["data:image/png;base64,iVBORw0KG..."]);
  });
});

describe("getLocalizedImageLinks", () => {
  it("deduplicates in supported language order and preserves English-only images", () => {
    expect(
      getLocalizedImageLinks({
        en: '<img src="/shared.jpg"><img src="/english.jpg">',
        zh: '<img src="/chinese.jpg"><img src="/shared.jpg">',
      }),
    ).toEqual(["/chinese.jpg", "/shared.jpg", "/english.jpg"]);
    expect(getLocalizedImageLinks({ en: '<img src="/english.jpg">' })).toEqual([
      "/english.jpg",
    ]);
  });

  it("accepts absent localized content", () => {
    expect(getLocalizedImageLinks(null)).toEqual([]);
    expect(getLocalizedImageLinks()).toEqual([]);
  });
});
