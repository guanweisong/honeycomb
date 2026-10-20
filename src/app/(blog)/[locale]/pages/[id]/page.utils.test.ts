import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PageStatus } from "@/features/page/page-status";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

import { assertPublishedPage } from "./page.utils";

describe("assertPublishedPage", () => {
  it("uses the page status owner rather than post status", () => {
    const source = readFileSync(
      "src/app/(blog)/[locale]/pages/[id]/page.utils.ts",
      "utf8",
    );
    expect(source).not.toContain("@/features/post/post-status");
    expect(source).toContain("@/features/page/page-status");
  });

  beforeEach(() => {
    mockNotFound.mockClear();
  });

  it.each([null, undefined])(
    "throws notFound for missing page detail %s",
    (detail) => {
      expect(() => assertPublishedPage(detail)).toThrow("NEXT_NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalledTimes(1);
    },
  );

  it.each([PageStatus.DRAFT, PageStatus.TO_AUDIT, "unknown", null, undefined])(
    "throws notFound for nonpublished page status %s",
    (status) => {
      expect(() => assertPublishedPage({ status })).toThrow("NEXT_NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalledTimes(1);
    },
  );

  it("returns published page detail unchanged", () => {
    const pageDetail = { status: PageStatus.PUBLISHED, id: "page-id" };

    expect(assertPublishedPage(pageDetail)).toBe(pageDetail);
  });
});
