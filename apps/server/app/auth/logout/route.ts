import { NextRequest } from "next/server";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { getAuthToken } from "@/libs/getAuthToken";
import { errorHandle } from "@/libs/errorHandle";

export async function POST(request: NextRequest) {
  return errorHandle(async () => {
    const token = getAuthToken(request);
    if (token) {
      await prisma.token.delete({ where: { content: token } });
    }
    return ResponseHandler.Create({ isOk: true });
  });
}
