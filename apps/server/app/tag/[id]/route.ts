import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { NextRequest } from "next/server";
import { TagUpdateSchema } from "@/app/tag/schemas/tag.update.schema";
import { UserLevel } from ".prisma/client";
import { validateAuth } from "@/libs/validateAuth";
import { validateParams } from "@/libs/validateParams";
import { errorHandle } from "@/libs/errorHandle";

export async function PATCH(
  request: NextRequest,
  { params: { id } }: { params: { id: string } },
) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR],
    async () => {
      const params = await request.clone().json();
      return validateParams(TagUpdateSchema, params, async (data) => {
        return errorHandle(async () => {
          const result = await prisma.tag.update({ where: { id }, data });
          return ResponseHandler.Update(result);
        });
      });
    },
  );
}
