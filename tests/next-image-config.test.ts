import { describe, expect, it } from "vitest";
import { imageConfig } from "../next.config";

describe("Next image configuration", () => {
  it("covers fixed UI images and responsive content formats", () => {
    expect(imageConfig.formats).toEqual(["image/avif", "image/webp"]);
    expect(imageConfig.imageSizes).toEqual(
      expect.arrayContaining([20, 32, 48, 64, 96, 128, 256, 384]),
    );
    expect(imageConfig.deviceSizes).toContain(640);
    expect(imageConfig.deviceSizes).toContain(1920);
    expect(Math.max(...imageConfig.imageSizes)).toBeLessThan(
      Math.min(...imageConfig.deviceSizes),
    );
  });
});
