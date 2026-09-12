import { StatusBadgeTone } from "@/packages/ui/extended/StatusBadge";

/** Shared badge tones for the page/post publication lifecycle. */
export const publicationStatusToneMap = {
  PUBLISHED: StatusBadgeTone.GREEN,
  DRAFT: StatusBadgeTone.GRAY,
  TO_AUDIT: StatusBadgeTone.AMBER,
} as const;
