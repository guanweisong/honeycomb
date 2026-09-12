import { expect, it } from "vitest";
import { StatusBadgeTone } from "@/packages/ui/extended/StatusBadge";
import { publicationStatusToneMap } from "./publication-status-tone";

it("maps the shared publication lifecycle to badge tones", () => {
  expect(publicationStatusToneMap).toEqual({
    PUBLISHED: StatusBadgeTone.GREEN,
    DRAFT: StatusBadgeTone.GRAY,
    TO_AUDIT: StatusBadgeTone.AMBER,
  });
});
