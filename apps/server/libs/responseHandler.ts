import { NextResponse } from "next/server";
import { HttpStatus } from "@/types/HttpStatus";
import { ZodError } from "zod";

export default class ResponseHandler {
  static Create = (result: unknown) => {
    return NextResponse.json(result, { status: HttpStatus.CREATED });
  };

  static Query = (result: unknown) => {
    return NextResponse.json(result, { status: HttpStatus.OK });
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
