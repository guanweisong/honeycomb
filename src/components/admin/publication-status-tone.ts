import { StatusBadgeTone } from "@/components/StatusBadge";

/** Shared badge tones for the page/post publication lifecycle. */
export const publicationStatusToneMap = {
  PUBLISHED: StatusBadgeTone.GREEN,
  DRAFT: StatusBadgeTone.GRAY,
  TO_AUDIT: StatusBadgeTone.AMBER,
} as const;
