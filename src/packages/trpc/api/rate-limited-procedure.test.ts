import { describe, expect, it, vi } from "vitest";
import { createMockContext, createMockDb } from "@tests/helpers/test-utils";
import { createTRPCRouter } from "./core";
import { createRateLimitedPublicProcedure } from "./rate-limited-procedure";

describe("createRateLimitedPublicProcedure", () => {
  it("rejects before the handler when the independent limit is exhausted", async () => {
    const handler = vi.fn(() => "handled");
    const limiter = {
      limit: vi.fn().mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 60_000,
      }),
    };
    const router = createTRPCRouter({
      expensive: createRateLimitedPublicProcedure({
        limiter,
        namespace: "expensive",
      }).query(handler),
    });
    const context = createMockContext(null, createMockDb());
    context.header.set("x-forwarded-for", "203.0.113.10");

    await expect(router.createCaller(context).expensive()).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(limiter.limit).toHaveBeenCalledWith("expensive:203.0.113.10");
    expect(handler).not.toHaveBeenCalled();
  });
});
