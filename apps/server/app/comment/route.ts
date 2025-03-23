import { NextRequest } from "next/server";
import { Resend } from "resend";
import Tools from "@/libs/tools";
import ResponseHandler from "@/libs/responseHandler";
import prisma from "@/libs/prisma";
import { DeleteBatchSchema } from "@/schemas/delete.batch.schema";
import { CommentListQuerySchema } from "@/app/comment/schemas/comment.list.query.schema";
import { CommentCreateSchema } from "@/app/comment/schemas/commnet.create.schema";
import { CommentStatus, UserLevel } from ".prisma/client";
import { getQueryParams } from "@/libs/getQueryParams";
import { validateParams } from "@/libs/validateParams";
import { validateAuth } from "@/libs/validateAuth";
import { validateCaptcha } from "@/libs/validateCaptcha";
import { errorHandle } from "@/libs/errorHandle";
import AdminCommentEmailMessage from "@/app/components/EmailMessage/AdminCommentEmailMessage";
import ReplyCommentEmailMessage from "@/app/components/EmailMessage/ReplyCommentEmailMessage";
import * as process from "process";
import { getCustomCommentLink } from "@/libs/getCustomCommentLink";

const resend = new Resend(process.env.RESEND_API_KEY);

const include = {
  post: {
    select: {
      id: true,
      title: true,
    },
  },
  page: {
    select: {
      id: true,
      title: true,
    },
  },
};

export async function GET(request: NextRequest) {
  // @ts-ignore
  return validateParams(
    // @ts-ignore
    CommentListQuerySchema,
    getQueryParams(request),
    async (data) => {
      return errorHandle(async () => {
        const { page, limit, sortField, sortOrder, ...rest } = data;
        const conditions = Tools.getFindConditionsByQueries(rest, ["status"]);
        const list = await prisma.comment.findMany({
          where: conditions,
          orderBy: { [sortField]: sortOrder },
          take: limit,
          skip: (page - 1) * limit,
          include: include,
        });
        list.forEach((item) => {
          const itemCustom = getCustomCommentLink(item.customId);
          if (itemCustom) {
            // @ts-ignore
            item.custom = itemCustom;
          }
        });
        const total = await prisma.comment.count({ where: conditions });
        const result = { list, total };
        return ResponseHandler.Query(result);
      });
    },
  );
}

export async function POST(request: NextRequest) {
  return validateCaptcha(request, async () => {
    const params = await request.clone().json();
    return validateParams(CommentCreateSchema, params, async (data) => {
      return errorHandle(async () => {
        const { captcha, ...rest } = data;
        const createResult = await prisma.comment.create({
          data: {
            ...rest,
            ip: request.headers.get("X-Forwarded-For"),
            status: CommentStatus.PUBLISH,
            userAgent: request.headers.get("user-agent")!,
          },
        });
        let currentComment = await prisma.comment.findUnique({
          where: { id: createResult.id },
          include: include,
        });
        const currentCustom = getCustomCommentLink(currentComment?.customId);
        if (currentCustom) {
          // @ts-ignore
          currentComment = { ...currentComment, custom: currentCustom };
        }
        const setting = await prisma.setting.findFirst();
        const siteNameZh = setting!.siteName!.zh;
        const systemEmail = `notice@guanweisong.com`;
        // 通知管理员
        // resend.emails
        //   .send({
        //     from: systemEmail,
        //     to: "307761682@qq.com",
        //     subject: `[${siteNameZh}]有一条新的评论`,
        //     react: AdminCommentEmailMessage({
        //       // @ts-ignore
        //       currentComment: currentComment,
        //       setting: setting!,
        //     }),
        //   })
        //   .then((e) => {
        //     console.log("SendEmail Success", e);
        //   })
        //   .catch((e) => {
        //     console.log("SendEmail Error", e);
        //   });
        // 通知被评论人
        // if (rest.parentId) {
        //   let parentComment = await prisma.comment.findUnique({
        //     where: { id: rest.parentId },
        //     include: include,
        //   });
        //   const parentCustom = getCustomCommentLink(parentComment?.customId);
        //   if (parentCustom) {
        //     // @ts-ignore
        //     parentComment = { ...parentComment, custom: parentCustom };
        //   }
        //   if (parentComment) {
        //     resend.emails
        //       .send({
        //         from: systemEmail,
        //         to: parentComment.email,
        //         subject: `您在[${siteNameZh}]的评论有新的回复`,
        //         react: ReplyCommentEmailMessage({
        //           // @ts-ignore
        //           currentComment: currentComment,
        //           setting: setting!,
        //           parentComment,
        //         }),
        //       })
        //       .then((e) => {
        //         console.log("SendEmail Success", e);
        //       })
        //       .catch((e) => {
        //         console.log("SendEmail Error", e);
        //       });
        //   }
        // }
        return ResponseHandler.Create(currentComment);
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
          const result = await prisma.comment.deleteMany({
            where: { id: { in: data.ids } },
          });
          return ResponseHandler.Delete();
        });
      },
    );
  });
}
