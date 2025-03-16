import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { NextRequest } from "next/server";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return errorHandle(async () => {
    const id = params.id;
    const result = await prisma.page.findUnique({
      where: { id },
      select: { views: true },
    });
    return ResponseHandler.Query(result);
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return errorHandle(async () => {
    const id = params.id;
    const result = await prisma.page.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });
    return ResponseHandler.Update(result);
  });
}
