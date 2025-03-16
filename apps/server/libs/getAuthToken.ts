import { NextRequest } from "next/server";

export const getAuthToken = (request: NextRequest) => {
  return request.headers.get("x-auth-token");
};
