import { NextRequest } from "next/server";
import Tools from "@/libs/tools";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { DeleteBatchSchema } from "@/schemas/delete.batch.schema";
import { CategoryListQuerySchema } from "@/app/category/schemas/category.list.query.schema";
import { CategoryCreateSchema } from "@/app/category/schemas/category.create.schema";
import { UserLevel } from ".prisma/client";
import { getQueryParams } from "@/libs/getQueryParams";
import { validateParams } from "@/libs/validateParams";
import { validateAuth } from "@/libs/validateAuth";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(request: NextRequest) {
  // @ts-ignore
  return validateParams(
    CategoryListQuerySchema,
    getQueryParams(request),
    async (data) => {
      return errorHandle(async () => {
        const { id, page, limit, sortField, sortOrder, title, ...rest } = data;
        const conditions = Tools.getFindConditionsByQueries(rest, ["status"], {
          title,
        });
        const list = await prisma.category.findMany({
          where: conditions,
          orderBy: { [sortField]: sortOrder },
          take: limit,
          skip: (page - 1) * limit,
        });
        const total = await prisma.category.count({ where: conditions });
        const result = { list: Tools.sonsTree(list, id!), total };
        return ResponseHandler.Query(result);
      });
    },
  );
}

export async function POST(request: NextRequest) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR],
    async () => {
      const params = await request.clone().json();
      return validateParams(CategoryCreateSchema, params, async (data) => {
        return errorHandle(async () => {
          const result = await prisma.category.create({ data });
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
            const result = await prisma.category.deleteMany({
              where: { id: { in: data.ids } },
            });
            return ResponseHandler.Delete();
          });
        },
      );
    },
  );
}
