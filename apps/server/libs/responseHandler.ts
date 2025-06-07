import { NextResponse } from "next/server";
import { HttpStatus } from "@/types/HttpStatus";
import { ZodError } from "zod";

/**
 * prisma查询产生的null值过滤
 * @param obj
 */
export function deepCleanNulls(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepCleanNulls);
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null) {
        cleaned[key] = deepCleanNulls(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export default class ResponseHandler {
  static Create = (result: unknown) => {
    return NextResponse.json(result, { status: HttpStatus.CREATED });
  };

  static Query = (result: unknown) => {
    return NextResponse.json(deepCleanNulls(result), { status: HttpStatus.OK });
  };

  static Update = (result: unknown) => {
    return NextResponse.json(result, { status: HttpStatus.CREATED });
  };

  static Delete = () => {
    return new Response(null, { status: HttpStatus.NO_CONTENT });
  };

  static Forbidden = (result: unknown) => {
    return NextResponse.json(result, { status: HttpStatus.FORBIDDEN });
  };

  static ValidateError = (error: ZodError) => {
    return NextResponse.json(
      { message: [error.issues[0].message] },
      { status: HttpStatus.BAD_REQUEST },
    );
  };

  static Error = () => {
    return NextResponse.json(
      { message: "服务器内部错误" },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  };
}
