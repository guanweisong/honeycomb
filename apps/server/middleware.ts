import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Cors from "@/libs/cors";

export default async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  console.log("request", req.url, req.body);

  return Cors(req, res, {
    credentials: true,
    origin: (origin) => {
      return origin!;
    },
  });
}
