import { StatusBadgeTone } from "@/components/StatusBadge";

export function getStatusBadgeTone(
  status: string,
  toneMap: Partial<Record<string, StatusBadgeTone>>,
  fallbackTone: StatusBadgeTone = StatusBadgeTone.GRAY,
) {
  return toneMap[status] ?? fallbackTone;
}
