import { expect, it } from "vitest";
import { StatusBadgeTone } from "@/components/StatusBadge";
import { PostStatus } from "@/features/post/types/post.status";
import { publicationStatusToneMap } from "./publication-status-tone";

it("maps the post publication lifecycle to badge tones", () => {
  expect(publicationStatusToneMap).toEqual({
    PUBLISHED: StatusBadgeTone.GREEN,
    DRAFT: StatusBadgeTone.GRAY,
    TO_AUDIT: StatusBadgeTone.AMBER,
  });
});

it("uses green for published posts", () => {
  expect(publicationStatusToneMap[PostStatus.PUBLISHED]).toBe(
    StatusBadgeTone.GREEN,
  );
});

it("uses gray for draft posts", () => {
  expect(publicationStatusToneMap[PostStatus.DRAFT]).toBe(StatusBadgeTone.GRAY);
});

it("uses amber for posts awaiting audit", () => {
  expect(publicationStatusToneMap[PostStatus.TO_AUDIT]).toBe(
    StatusBadgeTone.AMBER,
  );
});
