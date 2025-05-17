import { NextRequest } from "next/server";
import queryString from "query-string";

export const getQueryParams = (request: NextRequest) => {
  let result = {} as any;
  const queryStr = request.nextUrl.search;
  if (queryStr) {
    result = queryString.parse(queryStr, {
      arrayFormat: "bracket",
      parseNumbers: true,
      parseBooleans: true,
    });
  }
  // 过滤掉空字符串
  return Object.fromEntries(
    Object.entries(result).flatMap(([key, value]) => {
      if (typeof value === "string") {
        return value.trim() === "" ? [] : [[key, value]];
      }
      if (Array.isArray(value)) {
        const filtered = value.filter((v) => v !== "");
        return filtered.length > 0 ? [[key, filtered]] : [];
      }
      return [[key, value]];
    }),
  );
};
