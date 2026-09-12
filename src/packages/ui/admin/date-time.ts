import { format } from "date-fns";

export function formatAdminDateTime(
  value: string | number | Date | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : format(date, "yyyy-MM-dd HH:mm:ss");
}
