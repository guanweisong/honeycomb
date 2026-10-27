// @vitest-environment node

import { describe, expect, it } from "vitest";
import { TagType } from "@/features/tag/types/tag.type";

describe("domain contracts", () => {
  it("preserves stable tag.type values", () => {
    expect(Object.values(TagType)).toEqual([
      "ACTOR",
      "DIRECTOR",
      "MOVIE_STYLE",
      "GALLERY_STYLE",
    ]);
  });
});
