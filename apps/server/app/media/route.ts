import { NextRequest } from "next/server";
import Tools from "@/libs/tools";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { DeleteBatchSchema } from "@honeycomb/validation/schemas/delete.batch.schema";
import { MediaListQuerySchema } from "@honeycomb/validation/media/schemas/media.list.query.schema";
import S3 from "@/libs/S3";
import dayjs from "dayjs";
import { UserLevel } from ".prisma/client";
import { validateAuth } from "@/libs/validateAuth";
import { getQueryParams } from "@/libs/getQueryParams";
import { arraybufferToBuffer } from "@/libs/arraybufferToBuffer";
import sizeOf from "image-size";
import { validateParams } from "@/libs/validateParams";
import { errorHandle } from "@/libs/errorHandle";
import { getColor } from "@/libs/colorThief";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST],
    async () => {
      return validateParams(
        MediaListQuerySchema,
        getQueryParams(request),
        async (data) => {
          return errorHandle(async () => {
            const { page, limit, sortField, sortOrder, ...rest } = data;
            const conditions = Tools.getFindConditionsByQueries(rest, []);
            const list = await prisma.media.findMany({
              where: conditions,
              orderBy: { [sortField]: sortOrder },
              take: limit,
              skip: (page - 1) * limit,
            });
            const total = await prisma.media.count({ where: conditions });
            const result = { list, total };
            return ResponseHandler.Query(result);
          });
        },
      );
    },
  );
}

export async function POST(request: NextRequest) {
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR],
    async () => {
      return errorHandle(async () => {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const data = {} as any;
        data.name = file.name;
        data.size = file.size;
        data.type = file.type;
        const keyContent = dayjs().format("YYYY/MM/DD/HHmmssSSS");
        const filenameArray = file.name.split(".");
        const keySuffix = filenameArray[filenameArray.length - 1];
        const fileBuffer = await file.arrayBuffer();
        const url = await S3.putObject({
          Key: `${keyContent}.${keySuffix}`,
          Body: arraybufferToBuffer(fileBuffer),
          ContentType: file.type,
        });
        if (file.type.startsWith("image")) {
          const dimensions = sizeOf(arraybufferToBuffer(fileBuffer));
          data.width = dimensions.width;
          data.height = dimensions.height;
          const color = await getColor(url);
          data.color = `rgb(${color.join(",")})`;
        }
        data.url = url;
        data.key = `${keyContent}.${keySuffix}`;
        const result = await prisma.media.create({ data });
        return ResponseHandler.Create(result);
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
            const list = await prisma.media.findMany({
              where: { id: { in: data.ids } },
            });
            const keys = list.map((item) => item.key);
            await prisma.media.deleteMany({ where: { id: { in: data.ids } } });
            await S3.deleteMultipleObject({
              Objects: keys.map((item) => ({
                Key: item,
              })),
            });
            return ResponseHandler.Delete();
          });
        },
      );
    },
  );
}
