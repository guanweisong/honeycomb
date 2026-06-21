import { Badge } from "@/packages/ui/components/badge";

export enum StatusBadgeTone {
  GREEN = "green",
  RED = "red",
  AMBER = "amber",
  GRAY = "gray",
}

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
};

const toneClassMap: Record<StatusBadgeTone, string> = {
  [StatusBadgeTone.GREEN]:
    "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  [StatusBadgeTone.RED]:
    "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  [StatusBadgeTone.AMBER]:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  [StatusBadgeTone.GRAY]:
    "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
};

/**
 * 后台状态徽章。
 */
export function StatusBadge({
  label,
  tone = StatusBadgeTone.GRAY,
}: StatusBadgeProps) {
  return <Badge className={toneClassMap[tone]}>{label}</Badge>;
}
