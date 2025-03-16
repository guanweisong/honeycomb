import { NextRequest } from "next/server";
import ResponseHandler from "@/libs/responseHandler";

export async function GET(request: NextRequest) {
  return ResponseHandler.Query({ message: "Welcome to the Honeycomb API!" });
}
