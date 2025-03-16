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
  return result;
};
