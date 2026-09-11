import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryObservability } from "@/packages/infrastructure/observability/adapters/memory";
import { configureObservability } from "@/packages/infrastructure/observability/server";
import { CommentStatus } from "@/packages/domain/content/comment";
import type { CommentNotificationRepository } from "../application/repository";
import { sendCommentEmail } from "./comment-email";
import {
  logCommentNotificationFailure,
  notifyCommentCreated,
} from "./comment-delivery";

vi.mock("./comment-email", () => ({
  sendCommentEmail: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {
    promise,
    resolve,
    reject: (reason?: unknown) => reject(reason),
  };
}

const currentComment = {
  id: "comment-1",
  author: "Visitor",
  content: "Private comment",
  site: null,
  email: "visitor@example.test",
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

function createRepository(): CommentNotificationRepository {
  return {
    getComment: vi
      .fn()
      .mockResolvedValueOnce(currentComment)
      .mockResolvedValueOnce({ ...currentComment, id: "parent-1" }),
    getSetting: vi.fn().mockResolvedValue({ siteName: null }),
  };
}

describe("comment notification delivery logs", () => {
  afterEach(() => {
    configureObservability();
    vi.clearAllMocks();
  });

  it("等待管理员和回复通知均完成后才结束编排", async () => {
    const adminSendGate = deferred<void>();
    const replySendGate = deferred<void>();
    vi.mocked(sendCommentEmail)
      .mockImplementationOnce(() => adminSendGate.promise)
      .mockImplementationOnce(() => replySendGate.promise);

    let settled = false;
    const notification = notifyCommentCreated(
      createRepository(),
      "comment-1",
      "parent-1",
    ).then(() => {
      settled = true;
    });

    await vi.waitFor(() => {
      expect(sendCommentEmail).toHaveBeenCalledTimes(2);
    });
    expect(settled).toBe(false);

    adminSendGate.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);

    replySendGate.resolve();
    await expect(notification).resolves.toBeUndefined();
    expect(settled).toBe(true);
  });

  it("父评论准备失败时仍等待已开始的管理员通知", async () => {
    const adminSendGate = deferred<void>();
    const parentLookupGate = deferred<typeof currentComment | undefined>();
    const preparationError = new Error(
      "visitor@example.test private parent lookup",
    );
    vi.mocked(sendCommentEmail).mockImplementationOnce(
      () => adminSendGate.promise,
    );
    const repository = {
      getComment: vi
        .fn()
        .mockResolvedValueOnce(currentComment)
        .mockReturnValueOnce(parentLookupGate.promise),
      getSetting: vi.fn().mockResolvedValue({ siteName: null }),
    } satisfies CommentNotificationRepository;
    let settled = false;
    const notification = notifyCommentCreated(
      repository,
      "comment-1",
      "parent-1",
    );
    void notification.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await vi.waitFor(() => {
      expect(sendCommentEmail).toHaveBeenCalledOnce();
    });
    parentLookupGate.reject(preparationError);
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);

    adminSendGate.resolve();
    await expect(notification).rejects.toBe(preparationError);
  });

  it("在父评论准备期间立即处理管理员发送失败", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const adminSendGate = deferred<void>();
    const parentLookupGate = deferred<typeof currentComment | undefined>();
    const deliveryError = new Error("visitor@example.test private email");
    vi.mocked(sendCommentEmail).mockImplementationOnce(
      () => adminSendGate.promise,
    );
    const repository = {
      getComment: vi
        .fn()
        .mockResolvedValueOnce(currentComment)
        .mockReturnValueOnce(parentLookupGate.promise),
      getSetting: vi.fn().mockResolvedValue({ siteName: null }),
    } satisfies CommentNotificationRepository;
    const notification = notifyCommentCreated(
      repository,
      "comment-1",
      "parent-1",
    );

    await vi.waitFor(() => {
      expect(sendCommentEmail).toHaveBeenCalledOnce();
    });
    adminSendGate.reject(deliveryError);
    await vi.waitFor(() => {
      expect(memory.logEvents).toHaveLength(1);
    });
    expect(memory.logEvents[0]?.context).toEqual({
      service: "email",
      operation: "send-admin-notification",
      outcome: "error",
      errorType: "Error",
    });
    expect(JSON.stringify(memory.logEvents)).not.toContain("visitor@example.test");
    expect(JSON.stringify(memory.logEvents)).not.toContain("private email");

    parentLookupGate.resolve(undefined);
    await expect(notification).resolves.toBeUndefined();
  });

  it("records a structured failure without sensitive error details", () => {
    const memory = createMemoryObservability();
    configureObservability(memory);

    logCommentNotificationFailure(
      new Error("visitor@example.test 203.0.113.10 private comment"),
    );

    expect(memory.logEvents).toHaveLength(1);
    expect(memory.logEvents[0]?.context).toEqual({
      service: "email",
      operation: "prepare-comment-notification",
      outcome: "error",
      errorType: "Error",
    });
    expect(JSON.stringify(memory.logEvents)).not.toContain("visitor@example.test");
    expect(JSON.stringify(memory.logEvents)).not.toContain("203.0.113.10");
    expect(JSON.stringify(memory.logEvents)).not.toContain("private comment");
  });
});
