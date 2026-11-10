import type { CommentNotificationRepository } from "@/features/comment/server/comment-notification-repository";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryObservability } from "@tests/helpers/memory-observability";
import { configureObservability } from "@/lib/observability/server";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { sendCommentEmail } from "@/features/comment/notifications/comment-email";
import {
  logCommentNotificationFailure,
  notifyCommentCreated,
} from "@/features/comment/notifications/comment-delivery";

vi.mock("@/features/comment/notifications/comment-email", () => ({
  sendCommentEmail: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return {
    promise,
    resolve,
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

describe("comment notification delivery logs", () => {
  afterEach(() => {
    configureObservability();
    vi.clearAllMocks();
  });

  it("waits for the administrator delivery and logs a sanitized provider failure", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const error = new Error("visitor@example.test private email");
    vi.mocked(sendCommentEmail).mockRejectedValueOnce(error);
    await expect(
      notifyCommentCreated(
        {
          getComment: async () => currentComment,
          getSetting: async () => ({ siteName: null }),
        },
        "comment-1",
      ),
    ).resolves.toBeUndefined();
    expect(sendCommentEmail).toHaveBeenCalledOnce();
    expect(memory.logEvents[0]?.context).toEqual({
      service: "email",
      operation: "send-admin-notification",
      outcome: "error",
      errorType: "Error",
    });
    expect(JSON.stringify(memory.logEvents)).not.toContain(
      "visitor@example.test",
    );
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
    expect(JSON.stringify(memory.logEvents)).not.toContain(
      "visitor@example.test",
    );
    expect(JSON.stringify(memory.logEvents)).not.toContain("203.0.113.10");
    expect(JSON.stringify(memory.logEvents)).not.toContain("private comment");
  });

  it("starts both independent initial reads before either result is available", async () => {
    const commentRead = deferred<typeof currentComment>();
    const settingRead = deferred<{ siteName: null }>();
    const started: string[] = [];
    const repository = {
      getComment: () => {
        started.push("comment");
        return commentRead.promise;
      },
      getSetting: () => {
        started.push("setting");
        return settingRead.promise;
      },
    } satisfies CommentNotificationRepository;
    const delivery = notifyCommentCreated(repository, "comment-1");
    try {
      expect(started).toEqual(["comment", "setting"]);
      expect(sendCommentEmail).not.toHaveBeenCalled();
      commentRead.resolve(currentComment);
      await Promise.resolve();
      expect(sendCommentEmail).not.toHaveBeenCalled();
    } finally {
      commentRead.resolve(currentComment);
      settingRead.resolve({ siteName: null });
      await delivery;
    }
    expect(sendCommentEmail).toHaveBeenCalledExactlyOnceWith({
      setting: { siteName: null },
      currentComment,
    });
  });

  it.each(["comment", "setting"])(
    "does not send email when the initial %s read fails",
    async (failedRead) => {
      const failure = new Error("lookup failed");
      const repository = {
        getComment: async () => {
          if (failedRead === "comment") throw failure;
          return currentComment;
        },
        getSetting: async () => {
          if (failedRead === "setting") throw failure;
          return { siteName: null };
        },
      } satisfies CommentNotificationRepository;
      await expect(notifyCommentCreated(repository, "comment-1")).rejects.toBe(
        failure,
      );
      expect(sendCommentEmail).not.toHaveBeenCalled();
    },
  );

  it.each(["comment", "setting"])(
    "does not send email when the initial %s is missing",
    async (missingRead) => {
      const repository = {
        getComment: async () =>
          missingRead === "comment" ? undefined : currentComment,
        getSetting: async () =>
          missingRead === "setting" ? undefined : { siteName: null },
      } satisfies CommentNotificationRepository;
      await expect(
        notifyCommentCreated(repository, "comment-1"),
      ).rejects.toThrow("Comment or setting not found");
      expect(sendCommentEmail).not.toHaveBeenCalled();
    },
  );
});
