import { NextRequest } from "next/server";
import Tools from "@/libs/tools";
import { LinkListQuerySchema } from "@honeycomb/validation/link/schemas/link.list.query.schema";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { LinkCreateSchema } from "@honeycomb/validation/link/schemas/link.create.schema";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { UserLevel } from ".prisma/client";
import { getQueryParams } from "@/libs/getQueryParams";
import { validateAuth } from "@/libs/validateAuth";
import { validateParams } from "@/libs/validateParams";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(request: NextRequest) {
  return validateParams(
    LinkListQuerySchema,
    getQueryParams(request),
    async (data) => {
      return errorHandle(async () => {
        const { page, limit, sortField, sortOrder, ...rest } = data;
        const conditions = Tools.getFindConditionsByQueries(rest, ["status"]);
        const list = await prisma.link.findMany({
          where: conditions,
          orderBy: { [sortField]: sortOrder },
          take: limit,
          skip: (page - 1) * limit,
        });
        const total = await prisma.link.count({ where: conditions });
        const result = { list, total };
        return ResponseHandler.Query(result);
      });
    },
  );
}

export async function POST(request: NextRequest) {
  return validateAuth(request, [UserLevel.ADMIN], async () => {
    const params = await request.clone().json();
    return validateParams(LinkCreateSchema, params, async (data) => {
      return errorHandle(async () => {
        const result = await prisma.link.create({ data });
        return ResponseHandler.Create(result);
      });
    });
  });
}

export async function DELETE(request: NextRequest) {
  return validateAuth(request, [UserLevel.ADMIN], () => {
    return validateParams(
      DeleteBatchSchema,
      getQueryParams(request),
      async (data) => {
        return errorHandle(async () => {
          const result = await prisma.link.deleteMany({
            where: { id: { in: data.ids } },
          });
          return ResponseHandler.Delete();
        });
      },
    );
  });
}
