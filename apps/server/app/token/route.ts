import { NextRequest } from "next/server";
import Tools from "@/libs/tools";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { TokenListQuerySchema } from "@/app/token/schemas/token.list.query.schema";
import { UserLevel } from ".prisma/client";
import { getQueryParams } from "@/libs/getQueryParams";
import { validateAuth } from "@/libs/validateAuth";
import { validateParams } from "@/libs/validateParams";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(request: NextRequest) {
  return validateAuth(request, [UserLevel.ADMIN], async () => {
    // @ts-ignore
    return validateParams(
      TokenListQuerySchema,
      getQueryParams(request),
      async (data) => {
        return errorHandle(async () => {
          const { page, limit, sortField, sortOrder, ...rest } = data;
          const conditions = Tools.getFindConditionsByQueries(rest, ["status"]);
          const list = await prisma.token.findMany({
            where: conditions,
            orderBy: { [sortField]: sortOrder },
            take: limit,
            skip: (page - 1) * limit,
          });
          const total = await prisma.token.count({ where: conditions });
          const result = { list, total };
          return ResponseHandler.Query(result);
        });
      },
    );
  });
}
