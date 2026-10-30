import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { createAppAuthRequestHandler } from "@/app/auth/auth-request-audit";

const authHandler = toNextJsHandler(auth);

export const GET = createAppAuthRequestHandler(auth, authHandler.GET);
export const POST = createAppAuthRequestHandler(auth, authHandler.POST);
