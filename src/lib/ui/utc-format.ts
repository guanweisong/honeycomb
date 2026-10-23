import { UTCDateMini } from "@date-fns/utc";
import { format as formatDate } from "date-fns";

const DAYJS_TO_DATE_FNS_TOKEN_MAP: Record<string, string> = {
  YYYY: "yyyy",
  YY: "yy",
  DD: "dd",
  D: "d",
};

const toDateFnsPattern = (pattern: string) =>
  pattern.replace(/\[[^\]]*\]|'(?:[^']|'')*'|YYYY|YY|DD|D/g, (token) =>
    token.startsWith("[")
      ? `'${token.slice(1, -1).replaceAll("'", "''")}'`
      : (DAYJS_TO_DATE_FNS_TOKEN_MAP[token] ?? token),
  );

/** Format UTC dates with existing date-fns formats and common dayjs aliases. */
export const utcFormat = (input: string, pattern: string = "YYYY-MM-DD") => {
  const date = new UTCDateMini(input);
  if (Number.isNaN(date.getTime())) return "";
  return formatDate(date, toDateFnsPattern(pattern));
};
