import { NextRequest } from "next/server";
import ResponseHandler from "@/libs/responseHandler";
import { UserLevel } from ".prisma/client";
import { validateAuth } from "@/libs/validateAuth";

export async function GET(request: NextRequest) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST],
    async (userInfo) => {
      return ResponseHandler.Query(userInfo);
    },
    () => {
      return ResponseHandler.Query({});
    },
  );
}
