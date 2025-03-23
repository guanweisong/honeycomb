import { NextRequest } from "next/server";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { MenuUpdateSchema } from "@/app/menu/schemas/menu.update.schema";
import { MenuType, UserLevel } from ".prisma/client";
import { validateAuth } from "@/libs/validateAuth";
import { validateParams } from "@/libs/validateParams";
import { errorHandle } from "@/libs/errorHandle";

export async function GET() {
  return errorHandle(async () => {
    const list = await prisma.menu.findMany({
      orderBy: { power: "asc" },
    });
    const categoryList = await prisma.category.findMany();
    const pageList = await prisma.page.findMany();
    list.forEach((m) => {
      if (m.type === MenuType.CATEGORY) {
        categoryList.forEach((n) => {
          if (m.id.toString() === n.id.toString()) {
            // @ts-ignore
            m.title = n.title;
            // @ts-ignore
            m.path = n.path;
            m.parent = n.parent;
          }
        });
      }
      if (m.type === MenuType.PAGE) {
        pageList.forEach((n) => {
          if (m.id.toString() === n.id.toString()) {
            // @ts-ignore
            m.title = n.title;
          }
        });
      }
    });
    const total = await prisma.menu.count();
    return ResponseHandler.Query({ list, total });
  });
}

export async function PATCH(request: NextRequest) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR],
    async () => {
      const params = await request.clone().json();
      return validateParams(MenuUpdateSchema, params, async () => {
        return errorHandle(async () => {
          await prisma.menu.deleteMany({});
          const result = await prisma.menu.createMany({ data: params });
          return ResponseHandler.Create(result);
        });
      });
    },
  );
}
