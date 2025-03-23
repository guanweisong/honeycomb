import { NextRequest } from "next/server";
import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return errorHandle(async () => {
    const result = await prisma.post.findUnique({
      where: { id },
      select: {
        categoryId: true,
      },
    });
    return ResponseHandler.Query(result);
  });
}
