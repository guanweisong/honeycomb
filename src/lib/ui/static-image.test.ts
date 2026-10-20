import { expect, it } from "vitest";
import { parseStaticImage } from "./static-image";

it("rejects malformed loader output before it reaches Next Image", () => {
  expect(() => parseStaticImage({ src: 42 })).toThrow();
});

it("preserves image URL and static-loader metadata", () => {
  const metadata = { src: "/_next/static/image.svg", width: 20, height: 20 };
  expect(parseStaticImage(metadata)).toEqual(metadata);
  expect(parseStaticImage("/image.svg")).toBe("/image.svg");
});
