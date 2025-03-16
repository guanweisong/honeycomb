import prisma from "@/libs/prisma";
import Tools from "@/libs/tools";
import { NextRequest } from "next/server";
import { UserLevel, UserStatus } from ".prisma/client";
import { UserListQuerySchema } from "@/app/user/schemas/user.list.query.schema";
import ResponseHandler from "@/libs/responseHandler";
import { UserCreateSchema } from "@/app/user/schemas/user.create.schema";
import { DeleteBatchSchema } from "@/schemas/delete.batch.schema";
import { getQueryParams } from "@/libs/getQueryParams";
import { validateParams } from "@/libs/validateParams";
import { validateAuth } from "@/libs/validateAuth";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(request: NextRequest) {
  // @ts-ignore
  return validateParams(
    UserListQuerySchema,
    getQueryParams(request),
    async (data) => {
      return errorHandle(async () => {
        const { page, limit, sortField, sortOrder, ...rest } = data;
        const conditions = Tools.getFindConditionsByQueries(rest, [
          "level",
          "status",
        ]);
        const list = await prisma.user.findMany({
          where: conditions,
          orderBy: { [sortField]: sortOrder },
          take: limit,
          skip: (page - 1) * limit,
        });
        const total = await prisma.user.count({ where: conditions });
        const result = {
          list: list.map((item) => {
            const { password, ...rest } = item;
            return rest;
          }),
          total,
        };
        return ResponseHandler.Query(result);
      });
    },
  );
}

export async function POST(request: NextRequest) {
  return validateAuth(request, [UserLevel.ADMIN], async () => {
    const params = await request.clone().json();
    return validateParams(UserCreateSchema, params, async (data) => {
      return errorHandle(async () => {
        const result = await prisma.user.create({ data });
        return ResponseHandler.Create(result);
      });
    });
  });
}

export async function DELETE(request: NextRequest) {
  return validateAuth(request, [UserLevel.ADMIN], async () => {
    return validateParams(
      DeleteBatchSchema,
      getQueryParams(request),
      async (data) => {
        return errorHandle(async () => {
          const result = await prisma.user.updateMany({
            where: { id: { in: data.ids } },
            data: { status: UserStatus.DELETED },
          });
          return ResponseHandler.Delete();
        });
      },
    );
  });
}
