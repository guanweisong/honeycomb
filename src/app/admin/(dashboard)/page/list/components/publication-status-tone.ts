import { StatusBadgeTone } from "@/components/StatusBadge";
import { PageStatus } from "@/features/page/types/page.status";

/** 页面发布状态对应的后台徽章颜色。 */
export const publicationStatusToneMap = {
  [PageStatus.PUBLISHED]: StatusBadgeTone.GREEN,
  [PageStatus.DRAFT]: StatusBadgeTone.GRAY,
  [PageStatus.TO_AUDIT]: StatusBadgeTone.AMBER,
} as const satisfies Record<PageStatus, StatusBadgeTone>;
