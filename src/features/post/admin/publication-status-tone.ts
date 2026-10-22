import { StatusBadgeTone } from "@/components/StatusBadge";
import { PostStatus } from "@/features/post/types/post.status";

/** 文章发布状态对应的后台徽章颜色。 */
export const publicationStatusToneMap = {
  [PostStatus.PUBLISHED]: StatusBadgeTone.GREEN,
  [PostStatus.DRAFT]: StatusBadgeTone.GRAY,
  [PostStatus.TO_AUDIT]: StatusBadgeTone.AMBER,
} as const satisfies Record<PostStatus, StatusBadgeTone>;
