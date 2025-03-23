import { NextRequest } from "next/server";
import Tools from "@/libs/tools";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { DeleteBatchSchema } from "@/schemas/delete.batch.schema";
import { TagListQuerySchema } from "@/app/tag/schemas/tag.list.query.schema";
import { TagCreateSchema } from "@/app/tag/schemas/tag.create.schema";
import { UserLevel } from ".prisma/client";
import { getQueryParams } from "@/libs/getQueryParams";
import { validateParams } from "@/libs/validateParams";
import { validateAuth } from "@/libs/validateAuth";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(request: NextRequest) {
  // @ts-ignore
  return validateParams(
    // @ts-ignore
    TagListQuerySchema,
    getQueryParams(request),
    async (data) => {
      return errorHandle(async () => {
        const { page, limit, sortField, sortOrder, name, ...rest } = data;
        const conditions = Tools.getFindConditionsByQueries(rest, ["status"], {
          name,
        });
        const list = await prisma.tag.findMany({
          where: conditions,
          orderBy: { [sortField]: sortOrder },
          take: limit,
          skip: (page - 1) * limit,
        });
        const total = await prisma.tag.count({ where: conditions });
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
    async () => {
      const params = await request.clone().json();
      return validateParams(TagCreateSchema, params, async (data) => {
        return errorHandle(async () => {
          const result = await prisma.tag.create({ data });
          return ResponseHandler.Create(result);
        });
      });
    },
  );
}

export async function DELETE(request: NextRequest) {
  return validateAuth(request, [UserLevel.ADMIN], async () => {
    return validateParams(
      DeleteBatchSchema,
      getQueryParams(request),
      (data) => {
        return errorHandle(async () => {
          const result = await prisma.tag.deleteMany({
            where: { id: { in: data.ids } },
          });
          return ResponseHandler.Delete();
        });
      },
    );
  });
}
