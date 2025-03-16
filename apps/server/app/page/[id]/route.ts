import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { NextRequest } from "next/server";
import { PageUpdateSchema } from "@/app/page/schemas/page.update.schema";
import { Media, UserLevel } from ".prisma/client";
import { getAllImageLinkFormMarkdown } from "@/libs/getAllImageLinkFormMarkdown";
import { validateAuth } from "@/libs/validateAuth";
import { validateParams } from "@/libs/validateParams";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return errorHandle(async () => {
    const id = params.id;
    const result = await prisma.page.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const imageUrls: string[] = getAllImageLinkFormMarkdown(result?.content.zh);
    let imagesInContent: Media[] = [];
    if (imageUrls.length) {
      imagesInContent = await prisma.media.findMany({
        where: { url: { in: imageUrls } },
      });
    }
    return ResponseHandler.Query({ ...result, imagesInContent });
  });
}

export async function PATCH(
  request: NextRequest,
  { params: { id } }: { params: { id: string } },
) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR],
    async () => {
      const params = await request.clone().json();
      return validateParams(PageUpdateSchema, params, async (data) => {
        return errorHandle(async () => {
          const result = await prisma.page.update({ where: { id }, data });
          return ResponseHandler.Update(result);
        });
      });
    },
  );
}
