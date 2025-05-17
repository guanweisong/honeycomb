import { NextRequest } from "next/server";
import Tools from "@/libs/tools";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { DeleteBatchSchema } from "@/schemas/delete.batch.schema";
import { PostListQuerySchema } from "@/app/post/schemas/post.list.query.schema";
import { PostCreateSchema } from "@/app/post/schemas/post.create.schema";
import { UserLevel } from ".prisma/client";
import { getQueryParams } from "@/libs/getQueryParams";
import { validateParams } from "@/libs/validateParams";
import { validateAuth } from "@/libs/validateAuth";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(request: NextRequest) {
  return validateParams(
    PostListQuerySchema,
    getQueryParams(request),
    async (data) => {
      return errorHandle(async () => {
        const {
          page,
          limit,
          sortField,
          sortOrder,
          title,
          content,
          categoryId,
          tagName,
          userName,
          ...rest
        } = data;
        const conditions = Tools.getFindConditionsByQueries(
          rest,
          ["status", "type"],
          {
            title,
            content,
          },
        );
        const OR = [];
        if (categoryId) {
          const categoryListAll = await prisma.category.findMany();
          const categoryList = Tools.sonsTree(categoryListAll, categoryId);
          OR.push({ categoryId: categoryId });
          categoryList.forEach((item) => {
            OR.push({ categoryId: item.id });
          });
        }
        if (tagName) {
          const tagCondition = {
            OR: [
              { name: { is: { zh: tagName } } },
              { name: { is: { en: tagName } } },
            ],
          };
          const tag = {
            list: await prisma.tag.findMany({ where: tagCondition }),
            total: await prisma.tag.count({ where: tagCondition }),
          };
          if (tag.total) {
            const id = { hasSome: [tag.list[0].id] };
            OR.push(
              { galleryStyleIds: id },
              { movieActorIds: id },
              { movieStyleIds: id },
              { movieDirectorIds: id },
            );
          } else {
            return {
              list: [],
              total: 0,
            };
          }
        }
        if (userName) {
          const user = {
            list: await prisma.user.findMany({ where: { name: userName } }),
            total: await prisma.user.count({ where: { name: userName } }),
          };
          if (user.total) {
            conditions.authorId = user.list[0].id;
          } else {
            return {
              list: [],
              total: 0,
            };
          }
        }
        if (OR.length) {
          conditions.OR = OR;
        }
        console.log("conditions", conditions);
        const list = await prisma.post.findMany({
          where: conditions,
          orderBy: { [sortField]: sortOrder },
          take: limit,
          skip: (page - 1) * limit,
          include: {
            category: {
              select: {
                id: true,
                title: true,
              },
            },
            author: {
              select: {
                id: true,
                name: true,
              },
            },
            cover: {
              select: {
                id: true,
                url: true,
                width: true,
                height: true,
                color: true,
              },
            },
          },
        });
        const total = await prisma.post.count({ where: conditions });
        const result = {
          list: list.map((item) => {
            const { content, ...rest } = item;
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
  return validateAuth(
    request,
    [UserLevel.ADMIN, UserLevel.EDITOR],
    async (userInfo) => {
      const params = await request.clone().json();
      return validateParams(PostCreateSchema, params, async (data) => {
        return errorHandle(async () => {
          const result = await prisma.post.create({
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
            const result = await prisma.post.deleteMany({
              where: { id: { in: data.ids } },
            });
            return ResponseHandler.Delete();
          });
        },
      );
    },
  );
}
