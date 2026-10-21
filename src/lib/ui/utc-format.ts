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

// date-fns preserves Date subclasses when cloning and computing calendar
// boundaries. Redirect its local accessors to UTC rather than constructing a
// nonexistent local wall-clock time (DST gaps or historical skipped dates).
class UtcDate extends Date {
  override getFullYear() {
    return this.getUTCFullYear();
  }
  override getMonth() {
    return this.getUTCMonth();
  }
  override getDate() {
    return this.getUTCDate();
  }
  override getDay() {
    return this.getUTCDay();
  }
  override getHours() {
    return this.getUTCHours();
  }
  override getMinutes() {
    return this.getUTCMinutes();
  }
  override getSeconds() {
    return this.getUTCSeconds();
  }
  override getMilliseconds() {
    return this.getUTCMilliseconds();
  }
  override getTimezoneOffset() {
    return 0;
  }
  override setFullYear(...args: Parameters<Date["setUTCFullYear"]>) {
    return this.setUTCFullYear(...args);
  }
  override setMonth(...args: Parameters<Date["setUTCMonth"]>) {
    return this.setUTCMonth(...args);
  }
  override setDate(...args: Parameters<Date["setUTCDate"]>) {
    return this.setUTCDate(...args);
  }
  override setHours(...args: Parameters<Date["setUTCHours"]>) {
    return this.setUTCHours(...args);
  }
  override setMinutes(...args: Parameters<Date["setUTCMinutes"]>) {
    return this.setUTCMinutes(...args);
  }
  override setSeconds(...args: Parameters<Date["setUTCSeconds"]>) {
    return this.setUTCSeconds(...args);
  }
  override setMilliseconds(...args: Parameters<Date["setUTCMilliseconds"]>) {
    return this.setUTCMilliseconds(...args);
  }
}

/** Format UTC dates with existing date-fns formats and common dayjs aliases. */
export const utcFormat = (input: string, pattern: string = "YYYY-MM-DD") => {
  const date = new UtcDate(input);
  if (Number.isNaN(date.getTime())) return "";
  return formatDate(date, toDateFnsPattern(pattern));
};
