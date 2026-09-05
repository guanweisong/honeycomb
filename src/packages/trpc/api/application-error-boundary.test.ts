import { expect, it } from "vitest";
import { ApplicationError } from "@/packages/application/errors";
import { createMockContext } from "@tests/helpers/test-utils";
import { createTRPCRouter, publicProcedure } from "./core";

it("将仓储未命中错误转换为统一的NOT_FOUND响应", async () => {
  const router = createTRPCRouter({
    update: publicProcedure.mutation(() => {
      throw new ApplicationError("NOT_FOUND", "post not found");
    }),
  });
  await expect(
    router.createCaller(createMockContext()).update(),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
