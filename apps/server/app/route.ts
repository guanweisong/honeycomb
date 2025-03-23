import { NextRequest } from "next/server";
import ResponseHandler from "@/libs/responseHandler";

export async function GET(_request: NextRequest) {
  return ResponseHandler.Query({ message: "Welcome to the Honeycomb API!" });
}
