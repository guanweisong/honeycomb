import { describe, expect, it, vi } from "vitest";
import { CommentStatus } from "@/packages/domain/content/comment";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PageStatus } from "@/packages/domain/content/page";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { moderateComment } from "./application/comment-command-handlers";
import {
  createComment,
  destroyComments,
  updateComment,
} from "./application/comment-commands";

describe("Comment command handlers", () => {
  const requestMetadata = {
    ip: "203.0.113.10",
    userAgent: "test-agent",
  };
  const createdComment = {
    id: "comment-1",
    author: "Visitor",
    content: "Hello",
    site: null,
    email: "visitor@example.test",
    parentId: null,
    postId: "post-1",
    pageId: null,
    customId: null,
    status: CommentStatus.PUBLISH,
    createdAt: null,
    updatedAt: null,
    userAgent: "sensitive agent",
    ip: "203.0.113.10",
  };

  function createDependencies(overrides = {}) {
    return {
      repository: {
        createIfTargetMatches: vi.fn().mockResolvedValue(createdComment),
      },
      targetRepository: {
        findTarget: vi.fn().mockResolvedValue({
          type: "post",
          status: PostStatus.PUBLISHED,
          commentStatus: EnableStatus.ENABLE,
        }),
        findParentTarget: vi.fn().mockResolvedValue(null),
      },
      validateCaptcha: vi.fn().mockResolvedValue(undefined),
      notify: vi.fn().mockResolvedValue(undefined),
      logNotificationFailure: vi.fn(),
      invalidator: {
        invalidate: vi.fn().mockResolvedValue(undefined),
      },
      ...overrides,
    };
  }

  it("通知失败时仍返回已创建的脱敏评论", async () => {
    const notify = vi.fn().mockRejectedValue(new Error("notification failed"));
    const logNotificationFailure = vi.fn();

    const dependencies = createDependencies({ notify, logNotificationFailure });
    const result = await createComment(dependencies, requestMetadata, {
      author: createdComment.author,
      content: createdComment.content,
      email: createdComment.email,
      postId: createdComment.postId,
    });

    expect(result).toMatchObject({ id: createdComment.id, author: "Visitor" });
    expect(result).not.toHaveProperty("email");
    expect(logNotificationFailure).toHaveBeenCalledWith(expect.any(Error));
  });

  it("数据库创建失败时不调用通知", async () => {
    const notify = vi.fn();
    const invalidator = { invalidate: vi.fn() };

    await expect(
      createComment(
        createDependencies({
          repository: {
            createIfTargetMatches: vi
              .fn()
              .mockRejectedValue(new Error("database failed")),
          },
          notify,
          invalidator,
        }),
        requestMetadata,
        {
          author: createdComment.author,
          content: createdComment.content,
          email: createdComment.email,
          postId: createdComment.postId,
        },
      ),
    ).rejects.toThrow("database failed");

    expect(notify).not.toHaveBeenCalled();
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });

  it("按验证码、目标、数据库、通知、缓存的顺序创建评论", async () => {
    const order: string[] = [];
    const dependencies = createDependencies({
      repository: {
        createIfTargetMatches: vi.fn().mockImplementation(async () => {
          order.push("database");
          return createdComment;
        }),
      },
      targetRepository: {
        findTarget: vi.fn().mockImplementation(async () => {
          order.push("target");
          return {
            type: "post",
            status: PostStatus.PUBLISHED,
            commentStatus: EnableStatus.ENABLE,
          };
        }),
        findParentTarget: vi.fn().mockResolvedValue(null),
      },
      validateCaptcha: vi.fn().mockImplementation(async () => {
        order.push("captcha");
      }),
      notify: vi.fn().mockImplementation(async () => {
        order.push("notification");
      }),
      invalidator: {
        invalidate: vi.fn().mockImplementation(async () => {
          order.push("cache");
        }),
      },
    });

    await createComment(dependencies, requestMetadata, {
      author: createdComment.author,
      content: createdComment.content,
      email: createdComment.email,
      postId: createdComment.postId,
    });

    expect(order).toEqual([
      "captcha",
      "target",
      "database",
      "notification",
      "cache",
    ]);
    expect(dependencies.repository.createIfTargetMatches).toHaveBeenCalledWith(
      requestMetadata,
      expect.objectContaining({ postId: "post-1" }),
      {
        type: "post",
        status: PostStatus.PUBLISHED,
        commentStatus: EnableStatus.ENABLE,
      },
    );
    expect(dependencies.invalidator.invalidate).toHaveBeenCalledWith({
      contents: [{ id: "post-1", type: "post" }],
      refreshLayout: true,
    });
  });

  it("通知失败仍刷新缓存，缓存失败继续向上传播", async () => {
    const cacheError = new Error("cache failed");
    const dependencies = createDependencies({
      targetRepository: {
        findTarget: vi.fn().mockResolvedValue({
          type: "page",
          status: PageStatus.PUBLISHED,
        }),
        findParentTarget: vi.fn().mockResolvedValue(null),
      },
      notify: vi.fn().mockRejectedValue(new Error("notification failed")),
      invalidator: {
        invalidate: vi.fn().mockRejectedValue(cacheError),
      },
    });

    await expect(
      createComment(dependencies, requestMetadata, {
        author: createdComment.author,
        content: createdComment.content,
        email: createdComment.email,
        pageId: "page-1",
      }),
    ).rejects.toBe(cacheError);

    expect(dependencies.logNotificationFailure).toHaveBeenCalledOnce();
    expect(dependencies.invalidator.invalidate).toHaveBeenCalledWith({
      contents: [{ id: "page-1", type: "page" }],
      refreshLayout: true,
    });
  });

  it("父评论必须在插入前确认属于同一目标", async () => {
    const order: string[] = [];
    const dependencies = createDependencies({
      repository: {
        createIfTargetMatches: vi.fn().mockImplementation(async () => {
          order.push("database");
          return { ...createdComment, parentId: "parent-1" };
        }),
      },
      targetRepository: {
        findTarget: vi.fn().mockImplementation(async () => {
          order.push("target");
          return {
            type: "post",
            status: PostStatus.PUBLISHED,
            commentStatus: EnableStatus.ENABLE,
          };
        }),
        findParentTarget: vi.fn().mockImplementation(async () => {
          order.push("parent");
          return { type: "post", id: "post-1" };
        }),
      },
      validateCaptcha: vi.fn().mockImplementation(async () => {
        order.push("captcha");
      }),
      notify: vi.fn().mockImplementation(async () => {
        order.push("notification");
      }),
      invalidator: {
        invalidate: vi.fn().mockImplementation(async () => {
          order.push("cache");
        }),
      },
    });

    await createComment(dependencies, requestMetadata, {
      author: createdComment.author,
      content: createdComment.content,
      email: createdComment.email,
      parentId: "parent-1",
      postId: "post-1",
    });

    expect(order).toEqual([
      "captcha",
      "target",
      "parent",
      "database",
      "notification",
      "cache",
    ]);
  });

  it.each([
    {
      name: "目标不存在",
      state: null,
      expectedCode: "NOT_FOUND",
    },
    {
      name: "文章未发布",
      state: {
        type: "post",
        status: PostStatus.DRAFT,
        commentStatus: EnableStatus.ENABLE,
      },
      expectedCode: "NOT_FOUND",
    },
    {
      name: "文章关闭评论",
      state: {
        type: "post",
        status: PostStatus.PUBLISHED,
        commentStatus: EnableStatus.DISABLE,
      },
      expectedCode: "FORBIDDEN",
    },
    {
      name: "页面未发布",
      state: { type: "page", status: PageStatus.DRAFT },
      expectedCode: "NOT_FOUND",
    },
  ])("$name 时拒绝写入", async ({ state, expectedCode }) => {
    const dependencies = createDependencies({
      targetRepository: {
        findTarget: vi.fn().mockResolvedValue(state),
        findParentTarget: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      createComment(dependencies, requestMetadata, {
        author: createdComment.author,
        content: createdComment.content,
        email: createdComment.email,
        ...(state?.type === "page"
          ? { pageId: "page-1" }
          : { postId: "post-1" }),
      }),
    ).rejects.toMatchObject({ code: expectedCode });
    expect(
      dependencies.repository.createIfTargetMatches,
    ).not.toHaveBeenCalled();
  });

  it("拒绝同时关联多个评论目标", async () => {
    const dependencies = createDependencies();

    await expect(
      createComment(dependencies, requestMetadata, {
        author: createdComment.author,
        content: createdComment.content,
        email: createdComment.email,
        postId: "post-1",
        pageId: "page-1",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dependencies.targetRepository.findTarget).not.toHaveBeenCalled();
    expect(
      dependencies.repository.createIfTargetMatches,
    ).not.toHaveBeenCalled();
  });

  it("原子插入失败后目标恢复时仍拒绝返回成功", async () => {
    const dependencies = createDependencies({
      repository: { createIfTargetMatches: vi.fn().mockResolvedValue(null) },
    });
    await expect(
      createComment(dependencies, requestMetadata, {
        author: createdComment.author,
        content: createdComment.content,
        email: createdComment.email,
        postId: createdComment.postId,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dependencies.notify).not.toHaveBeenCalled();
    expect(dependencies.invalidator.invalidate).not.toHaveBeenCalled();
  });

  it("父评论属于其他目标时拒绝写入", async () => {
    const dependencies = createDependencies({
      targetRepository: {
        findTarget: vi.fn().mockResolvedValue({
          type: "post",
          status: PostStatus.PUBLISHED,
          commentStatus: EnableStatus.ENABLE,
        }),
        findParentTarget: vi
          .fn()
          .mockResolvedValue({ type: "post", id: "post-2" }),
      },
    });

    await expect(
      createComment(dependencies, requestMetadata, {
        author: createdComment.author,
        content: createdComment.content,
        email: createdComment.email,
        parentId: "parent-1",
        postId: "post-1",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(
      dependencies.repository.createIfTargetMatches,
    ).not.toHaveBeenCalled();
  });

  it("审核成功后返回持久化结果", async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ id: "comment-1", status: CommentStatus.PUBLISH });
    await expect(
      moderateComment(
        { update },
        {
          id: "comment-1",
          currentStatus: CommentStatus.TO_AUDIT,
          status: CommentStatus.PUBLISH,
        },
      ),
    ).resolves.toEqual({ id: "comment-1", status: CommentStatus.PUBLISH });
    expect(update).toHaveBeenCalledWith({
      id: "comment-1",
      status: CommentStatus.PUBLISH,
    });
  });

  it("更新评论状态时必须先经过评论聚合", async () => {
    const findStatus = vi.fn().mockResolvedValue(CommentStatus.TO_AUDIT);
    const update = vi
      .fn()
      .mockResolvedValue({ id: "comment-1", status: CommentStatus.PUBLISH });

    await updateComment(
      { findStatus, update },
      { id: "comment-1", status: CommentStatus.PUBLISH },
      { invalidate: vi.fn().mockResolvedValue(undefined) },
    );

    expect(findStatus).toHaveBeenCalledWith("comment-1");
    expect(update).toHaveBeenCalledWith({
      id: "comment-1",
      status: CommentStatus.PUBLISH,
    });
  });

  it("拒绝评论聚合不支持的状态流转", async () => {
    const findStatus = vi.fn().mockResolvedValue(CommentStatus.PUBLISH);
    const update = vi.fn();

    await expect(
      updateComment(
        { findStatus, update },
        { id: "comment-1", status: CommentStatus.TO_AUDIT },
        { invalidate: vi.fn().mockResolvedValue(undefined) },
      ),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });

  it("更新与删除评论仅在持久化成功后刷新全部公开内容", async () => {
    const invalidator = { invalidate: vi.fn().mockResolvedValue(undefined) };
    const update = vi.fn().mockResolvedValue({ id: "comment-1" });
    const destroy = vi.fn().mockResolvedValue({ success: true });

    await updateComment(
      { findStatus: vi.fn(), update },
      { id: "comment-1" },
      invalidator,
    );
    await destroyComments({ destroy }, ["comment-1"], invalidator);

    expect(invalidator.invalidate).toHaveBeenNthCalledWith(1, {
      refreshLayout: true,
    });
    expect(invalidator.invalidate).toHaveBeenNthCalledWith(2, {
      refreshLayout: true,
    });
  });
});
