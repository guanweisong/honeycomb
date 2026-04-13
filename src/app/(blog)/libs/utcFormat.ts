import { format as formatDate } from "date-fns";

const DAYJS_TO_DATE_FNS_TOKEN_MAP: Array<[string, string]> = [
  ["YYYY", "yyyy"],
  ["YY", "yy"],
  ["DD", "dd"],
  ["D", "d"],
];

const toDateFnsPattern = (pattern: string) => {
  return DAYJS_TO_DATE_FNS_TOKEN_MAP.reduce(
    (current, [dayjsToken, dateFnsToken]) =>
      current.replaceAll(dayjsToken, dateFnsToken),
    pattern,
  );
};

const toUtcShadowDate = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
};

/**
 * 格式化 UTC 日期。
 * @param {string} date - UTC 日期字符串。
 * @param {string} [format="YYYY-MM-DD"] - 格式化字符串（兼容常见 dayjs token）。
 * @returns {string} 格式化后的日期字符串。
 */
export const utcFormat = (date: string, format: string = "YYYY-MM-DD") => {
  const utcDate = toUtcShadowDate(date);
  if (!utcDate) return "";

  return formatDate(utcDate, toDateFnsPattern(format));
};
