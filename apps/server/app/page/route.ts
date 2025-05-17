import { NextRequest } from "next/server";
import Tools from "@/libs/tools";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { DeleteBatchSchema } from "@/schemas/delete.batch.schema";
import { PageListQuerySchema } from "@/app/page/schemas/page.list.query.schema";
import { PageCreateSchema } from "@/app/page/schemas/page.create.schema";
import { UserLevel } from ".prisma/client";
import { getQueryParams } from "@/libs/getQueryParams";
import { validateParams } from "@/libs/validateParams";
import { validateAuth } from "@/libs/validateAuth";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(request: NextRequest) {
  return validateParams(
    PageListQuerySchema,
    getQueryParams(request),
    async (data) => {
      return errorHandle(async () => {
        const { page, limit, sortField, sortOrder, title, content, ...rest } =
          data;
        const conditions = Tools.getFindConditionsByQueries(rest, ["status"], {
          title,
          content,
        });
        const list = await prisma.page.findMany({
          where: conditions,
          orderBy: { [sortField]: sortOrder },
          take: limit,
          skip: (page - 1) * limit,
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
        const total = await prisma.page.count({ where: conditions });
        const result = { list, total };
        return ResponseHandler.Query(result);
      });
    },
  );
}

export async function POST(request: NextRequest) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR],
    async (userInfo) => {
      const params = await request.clone().json();
      return validateParams(PageCreateSchema, params, async (data) => {
        return errorHandle(async () => {
          const result = await prisma.page.create({
            data: { ...data, authorId: userInfo.id },
          });
          return ResponseHandler.Create(result);
        });
      });
    },
  );
}

export async function DELETE(request: NextRequest) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR],
    async () => {
      return validateParams(
        DeleteBatchSchema,
        getQueryParams(request),
        async (data) => {
          return errorHandle(async () => {
            const result = await prisma.page.deleteMany({
              where: { id: { in: data.ids } },
            });
            return ResponseHandler.Delete();
          });
        },
      );
    },
  );
}
