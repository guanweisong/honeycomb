import { StatusBadgeTone } from "@/packages/ui/extended/StatusBadge";

export function getStatusBadgeTone(
  status: string,
  toneMap: Partial<Record<string, StatusBadgeTone>>,
  fallbackTone: StatusBadgeTone = StatusBadgeTone.GRAY,
) {
  return toneMap[status] ?? fallbackTone;
}
