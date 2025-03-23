import { LinkUpdateSchema } from "@/app/link/schemas/link.update.schema";
import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { NextRequest } from "next/server";
import { UserLevel } from ".prisma/client";
import { validateAuth } from "@/libs/validateAuth";
import { validateParams } from "@/libs/validateParams";
import { errorHandle } from "@/libs/errorHandle";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return validateAuth(request, [UserLevel.ADMIN], async () => {
    const params = await request.clone().json();
    return validateParams(LinkUpdateSchema, params, async (data) => {
      return errorHandle(async () => {
        const result = await prisma.link.update({ where: { id }, data });
        return ResponseHandler.Update(result);
      });
    });
  });
}
