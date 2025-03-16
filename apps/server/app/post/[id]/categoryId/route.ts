import { NextRequest } from "next/server";
import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return errorHandle(async () => {
    const id = params.id;
    const result = await prisma.post.findUnique({
      where: { id },
      select: {
        categoryId: true,
      },
    });
    return ResponseHandler.Query(result);
  });
}
