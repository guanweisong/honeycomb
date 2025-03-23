import { NextRequest } from "next/server";
import prisma from "@/libs/prisma";
import ResponseHandler from "@/libs/responseHandler";
import { errorHandle } from "@/libs/errorHandle";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return errorHandle(async () => {
    const { id } = await params;
    const allIds = await prisma.post
      .findMany({ where: { categoryId: id }, select: { id: true } })
      .then((result) => result.map((item) => item.id));
    const randomArr = (arr: string[], num: number) => {
      let newArr = [];
      const length = Math.min(num, arr.length);
      for (let i = 0; i < length; i++) {
        let temp = Math.floor(Math.random() * arr.length);
        newArr.push(arr[temp]);
        arr.splice(temp, 1);
      }
      return newArr;
    };
    const randomIds = randomArr(allIds, 10);
    const result = await prisma.post.findMany({
      where: { id: { in: randomIds } },
      select: {
        title: true,
        quoteContent: true,
        id: true,
      },
    });
    return ResponseHandler.Query(result);
  });
}
