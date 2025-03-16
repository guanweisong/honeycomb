import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { errorHandle } from "@/libs/errorHandle";
import * as process from "process";

export const dynamic = "force-dynamic";

export async function GET() {
  return errorHandle(async () => {
    const result = await prisma.setting.findFirst();
    return ResponseHandler.Query({
      ...result,
      customObjectId: { link: process.env.LINK_OBJECT_ID },
    });
  });
}
