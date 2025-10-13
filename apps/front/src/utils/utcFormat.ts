import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/**
 * 格式化 UTC 日期。
 * 使用 dayjs 库将 UTC 日期字符串格式化为指定格式。
 * @param {string} date - UTC 日期字符串。
 * @param {string} [format="YYYY-MM-DD"] - 格式化字符串。
 * @returns {string} 格式化后的日期字符串。
 */
export const utcFormat = (date: string, format: string = "YYYY-MM-DD") => {
  return dayjs.utc(date).format(format);
};
