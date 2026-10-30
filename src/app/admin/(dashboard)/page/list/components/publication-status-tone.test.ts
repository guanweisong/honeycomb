import { expect, it } from "vitest";
import { StatusBadgeTone } from "@/components/StatusBadge";
import { PageStatus } from "@/features/page/types/page.status";
import { publicationStatusToneMap } from "@/app/admin/(dashboard)/page/list/components/publication-status-tone";

it("maps the page publication lifecycle to badge tones", () => {
  expect(publicationStatusToneMap).toEqual({
    PUBLISHED: StatusBadgeTone.GREEN,
    DRAFT: StatusBadgeTone.GRAY,
    TO_AUDIT: StatusBadgeTone.AMBER,
  });
});

it("uses green for published pages", () => {
  expect(publicationStatusToneMap[PageStatus.PUBLISHED]).toBe(
    StatusBadgeTone.GREEN,
  );
});

it("uses gray for draft pages", () => {
  expect(publicationStatusToneMap[PageStatus.DRAFT]).toBe(StatusBadgeTone.GRAY);
});

it("uses amber for pages awaiting audit", () => {
  expect(publicationStatusToneMap[PageStatus.TO_AUDIT]).toBe(
    StatusBadgeTone.AMBER,
  );
});
