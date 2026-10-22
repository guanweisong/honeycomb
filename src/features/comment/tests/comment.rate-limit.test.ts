import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRatelimit } from "@/lib/rate-limit/rate-limit";
import { createMockContext, createMockDb } from "@tests/helpers/test-utils";
import { TEST_IDS } from "@tests/helpers/test-constants";

const { limiter } = vi.hoisted(() => ({
  limiter: { limit: vi.fn<ApiRatelimit["limit"]>() },
}));

vi.mock("@/lib/rate-limit/rate-limit", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/rate-limit/rate-limit")>();
  return {
    ...actual,
    createApiRatelimit: vi.fn(() => limiter),
    limitWithTimeout: vi.fn(actual.limitWithTimeout),
  };
});

import {
  createApiRatelimit,
  limitWithTimeout,
} from "@/lib/rate-limit/rate-limit";
import * as commentCommands from "@/features/comment/server/comment-commands";
import { commentRouter } from "@/features/comment/router";

const input = {
  author: "Comment author",
  content: "Comment content",
  email: "commenter@example.test",
  captchaToken: "synthetic-captcha",
  postId: TEST_IDS.ID_1,
} satisfies Parameters<ReturnType<typeof createCaller>["create"]>[0];

function createCaller() {
  const context = createMockContext(null, createMockDb());
  context.header.set("x-forwarded-for", "203.0.113.10");
  return commentRouter.createCaller(context);
}

describe("comment creation rate-limit composition", () => {
  beforeEach(() => {
    limiter.limit.mockReset();
    vi.mocked(limitWithTimeout).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("owns the independent five-request limit and comment prefix", () => {
    expect(createApiRatelimit).toHaveBeenCalledExactlyOnceWith({
      limit: 5,
      prefix: "ratelimit:comment-create",
    });
  });

  it("rejects exhausted requests before invoking comment commands", async () => {
    const createComment = vi.spyOn(commentCommands, "createComment");
    limiter.limit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    await expect(createCaller().create(input)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(limiter.limit).toHaveBeenCalledExactlyOnceWith(
      "comment.create:203.0.113.10",
    );
    expect(limitWithTimeout).toHaveBeenCalledExactlyOnceWith(
      limiter,
      "comment.create:203.0.113.10",
      { fallbackLimit: 5, timeoutMs: undefined },
    );
    expect(createComment).not.toHaveBeenCalled();
  });

  it("retains a five-request fallback and fails closed in production", async () => {
    const createComment = vi.spyOn(commentCommands, "createComment");
    vi.stubEnv("NODE_ENV", "production");
    limiter.limit.mockRejectedValue(new Error("Synthetic provider failure"));

    await expect(createCaller().create(input)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
    await expect(
      vi.mocked(limitWithTimeout).mock.results[0]?.value,
    ).resolves.toMatchObject({
      success: false,
      unavailable: true,
      limit: 5,
      remaining: 0,
    });
    expect(createComment).not.toHaveBeenCalled();
  });
});
