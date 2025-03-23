import { NextRequest } from "next/server";
import prisma from "@/libs/prisma";
import { SettingUpdateSchema } from "@/app/setting/schemas/setting.update.schema";
import ResponseHandler from "@/libs/responseHandler";
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
    return validateParams(SettingUpdateSchema, params, async (data) => {
      return errorHandle(async () => {
        const result = await prisma.setting.update({ where: { id }, data });
        return ResponseHandler.Update(result);
      });
    });
  });
}
