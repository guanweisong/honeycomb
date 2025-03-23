import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { NextRequest } from "next/server";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return errorHandle(async () => {
    const result = await prisma.post.findUnique({
      where: { id },
      select: { views: true },
    });
    return ResponseHandler.Query(result);
  });
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return errorHandle(async () => {
    const result = await prisma.post.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });
    return ResponseHandler.Update(result);
  });
}
