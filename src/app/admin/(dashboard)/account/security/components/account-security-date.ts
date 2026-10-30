export function formatAccountSecurityDate(
  value: Date | string | undefined,
): string {
  if (!value) return "未知时间";
  const normalized =
    typeof value === "string" && /^\d+(\.\d+)?$/.test(value)
      ? Number(value)
      : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? "未知时间"
    : date.toLocaleString("zh-CN", { hour12: false });
}
