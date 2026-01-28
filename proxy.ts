import { NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  console.log("request", req.url);

  return NextResponse.next();
}
