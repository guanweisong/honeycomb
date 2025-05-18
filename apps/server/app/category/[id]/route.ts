import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { NextRequest } from "next/server";
import { CategoryUpdateSchema } from "@honeycomb/validation/category/schemas/category.update.schema";
import { UserLevel } from ".prisma/client";
import { validateAuth } from "@/libs/validateAuth";
import { validateParams } from "@/libs/validateParams";
import { errorHandle } from "@/libs/errorHandle";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR],
    async () => {
      const params = await request.clone().json();
      return validateParams(CategoryUpdateSchema, params, async (data) => {
        return errorHandle(async () => {
          const result = await prisma.category.update({ where: { id }, data });
          return ResponseHandler.Update(result);
        });
      });
    },
  );
}
