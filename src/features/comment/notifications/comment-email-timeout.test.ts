// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryObservability } from "@tests/helpers/memory-observability";
import { configureObservability } from "@/lib/observability/server";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { PostStatus } from "@/features/post/types/post.status";
import { EnableStatus } from "@/lib/validation/enable-status";
import { createComment } from "../server/comment-commands";
import { notifyCommentCreated } from "./comment-delivery";
import { sendCommentEmail } from "./comment-email";

// Keep the real Resend SDK and its HTTP transport; templates are unrelated to deadlines.
vi.mock("./templates/AdminCommentEmailMessage", () => ({
  default: () => null,
}));
vi.mock("./templates/ReplyCommentEmailMessage", () => ({
  default: () => null,
}));

const currentComment = {
  id: "comment-1",
  author: "Reader",
  content: "Synthetic comment",
  site: null,
  email: "reader@example.test",
  parentId: "parent-1",
  postId: "post-1",
  pageId: null,
  customId: null,
  status: CommentStatus.PUBLISH,
  createdAt: null,
  updatedAt: null,
  userAgent: null,
  ip: null,
  post: null,
  page: null,
};
const setting = { siteName: { zh: "站点", en: "Site" } };
const payload = { setting, currentComment, parentComment: currentComment };

describe("comment email HTTP deadlines", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "synthetic-api-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "sender@example.test");
    vi.stubEnv("ADMIN_EMAIL", "admin@example.test");
    configureObservability(createMemoryObservability());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    configureObservability();
  });

  function stallHttp() {
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn(
      (_url: string, options?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = options?.signal;
          if (signal) {
            signals.push(signal);
            signal.addEventListener(
              "abort",
              () => reject(new Error("synthetic aborted request")),
              { once: true },
            );
          }
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return { fetchMock, signals };
  }

  it.each(["ADMIN_NOTICE", "REPLY_NOTICE"] as const)(
    "aborts stalled %s HTTP without retry",
    async (type) => {
      const { fetchMock, signals } = stallHttp();
      let outcome = "pending";
      const sending = sendCommentEmail(type, payload).then(
        () => {
          outcome = "success";
        },
        () => {
          outcome = "failed";
        },
      );
      await vi.advanceTimersByTimeAsync(4999);
      expect(outcome).toBe("pending");
      await vi.advanceTimersByTimeAsync(1);
      expect(outcome).toBe("failed");
      expect(signals).toHaveLength(1);
      expect(signals[0]?.aborted).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      await sending;
    },
  );

  it("clears a successful send deadline without aborting its HTTP request", async () => {
    let signal: AbortSignal | null | undefined;
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => {
      signal = options?.signal;
      return Promise.resolve(Response.json({ id: "synthetic-message" }));
    });
    vi.stubGlobal("fetch", fetchMock);
    await sendCommentEmail("ADMIN_NOTICE", payload);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(signal?.aborted).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns the committed public comment and invalidates caches after both email requests time out", async () => {
    const { fetchMock, signals } = stallHttp();
    const invalidate = vi.fn().mockResolvedValue({ state: "completed" });
    const notifications = {
      getComment: vi.fn().mockResolvedValue(currentComment),
      getSetting: vi.fn().mockResolvedValue(setting),
    };
    let completed = false;
    const submission = createComment(
      {
        repository: {
          createIfTargetMatches: vi.fn().mockResolvedValue(currentComment),
        },
        targetRepository: {
          findTarget: vi.fn().mockResolvedValue({
            type: "post",
            status: PostStatus.PUBLISHED,
            commentStatus: EnableStatus.ENABLE,
          }),
          findParentTarget: vi
            .fn()
            .mockResolvedValue({ type: "post", id: "post-1" }),
        },
        validateCaptcha: vi.fn(),
        notify: (id, parentId) =>
          notifyCommentCreated(notifications, id, parentId),
        logNotificationFailure: vi.fn(),
        invalidator: { invalidate },
      },
      { ip: "203.0.113.1", userAgent: "synthetic-agent" },
      {
        author: currentComment.author,
        email: currentComment.email,
        content: currentComment.content,
        postId: "post-1",
        parentId: "parent-1",
      },
    ).then((result) => {
      completed = true;
      return result;
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(completed).toBe(true);
    const result = await submission;
    expect(result).toMatchObject({
      id: "comment-1",
      content: "Synthetic comment",
    });
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("ip");
    expect(invalidate).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
