import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";

export function assertPostDetail<T>(postDetail: T | null | undefined): T {
  if (!postDetail) {
    notFound();
  }

  return postDetail;
}

export function handlePostDetailError(error: unknown): never {
  if (error instanceof TRPCError && error.code === "NOT_FOUND") {
    notFound();
  }

  throw error;
}
