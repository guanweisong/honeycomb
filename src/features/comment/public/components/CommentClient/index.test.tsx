import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MenuType } from "@/features/menu/types/menu.type";
import { CommentStatus } from "@/features/comment/types/comment.status";

import {
  mockToastError,
  mockUseMutation,
  mockUseTranslations,
  mockUseRouter,
  mockUsePathname,
  mockClientEnv,
  mockMutateAsync,
  mockRouterRefresh,
} from "@tests/helpers/comment-client-test-helpers";

import CommentClient from "@/features/comment/public/components/CommentClient/index";

const commentPromise = Promise.resolve({ total: 0, list: [] });

describe("CommentClient", () => {
  let container: HTMLDivElement;
  let root: Root;
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockToastError.mockReset();
    mockUseMutation.mockReset();
    mockUseTranslations.mockReset();
    mockUseRouter.mockReset();
    mockUsePathname.mockReset();
    mockClientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = undefined;
    mockUseTranslations.mockReturnValue((key: string) => {
      if (key === "captchaRequired") return "请先完成验证码验证";
      return key;
    });
    mockUseRouter.mockReturnValue({
      refresh: mockRouterRefresh,
    });
    mockUsePathname.mockReturnValue("/zh/list/category");
    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    mockMutateAsync.mockReset();
    mockRouterRefresh.mockReset();
    localStorage.clear();
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    alertSpy.mockRestore();
  });

  it("shows a toast when captcha has not been completed", async () => {
    mockClientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";

    await act(async () => {
      root.render(
        React.createElement(
          React.Suspense,
          { fallback: null },
          React.createElement(CommentClient, {
            id: "post-1",
            type: MenuType.CATEGORY,
            queryCommentPromise: commentPromise,
          }),
        ),
      );
      await Promise.resolve();
    });

    (
      container.querySelector('input[name="author"]') as HTMLInputElement
    ).value = "Alice";
    (container.querySelector('input[name="email"]') as HTMLInputElement).value =
      "alice@example.com";
    (
      container.querySelector('textarea[name="content"]') as HTMLTextAreaElement
    ).value = "Hello world";

    const submit = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(submit?.disabled).toBe(false);

    await act(async () => {
      submit?.click();
    });

    expect(mockToastError).toHaveBeenCalledWith("请先完成验证码验证");
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("refreshes the client view after the server mutation succeeds", async () => {
    mockMutateAsync.mockResolvedValue({ id: "comment-id" });

    await act(async () => {
      root.render(
        React.createElement(
          React.Suspense,
          { fallback: null },
          React.createElement(CommentClient, {
            id: "507f1f77bcf86cd799439011",
            type: MenuType.CATEGORY,
            queryCommentPromise: commentPromise,
          }),
        ),
      );
      await Promise.resolve();
    });

    (
      container.querySelector('input[name="author"]') as HTMLInputElement
    ).value = "Alice";
    (container.querySelector('input[name="email"]') as HTMLInputElement).value =
      "alice@example.com";
    (
      container.querySelector('textarea[name="content"]') as HTMLTextAreaElement
    ).value = "Hello world";

    await act(async () => {
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      await Promise.resolve();
    });

    expect(mockRouterRefresh).toHaveBeenCalledOnce();
  });

  it("restores and clears the saved identity using the existing user key", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        author: "Alice",
        email: "alice@example.com",
        site: "https://example.com",
      }),
    );

    await act(async () => {
      root.render(
        React.createElement(
          React.Suspense,
          { fallback: null },
          React.createElement(CommentClient, {
            id: "post-1",
            type: MenuType.CATEGORY,
            queryCommentPromise: commentPromise,
          }),
        ),
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain("welcomeBack: Alice");
    expect(container.querySelector('input[name="author"]')).toBeNull();

    const quit = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent?.includes("quit"),
    );
    await act(async () => quit?.click());

    expect(localStorage.getItem("user")).toBeNull();
    expect(container.querySelector('input[name="author"]')).not.toBeNull();
  });

  it("renders nested comments, hides banned content, and selects a reply", async () => {
    const scrollTo = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);
    const treePromise = Promise.resolve({
      total: 2,
      list: [
        {
          id: "parent",
          author: "Parent",
          content: "visible content",
          site: null,
          parentId: null,
          status: CommentStatus.PUBLISH,
          createdAt: null,
          avatar: "/logo.jpg",
          children: [
            {
              id: "child",
              author: "Child",
              content: "hidden content",
              site: null,
              parentId: "parent",
              status: CommentStatus.BAN,
              createdAt: null,
              avatar: "/logo.jpg",
              children: [],
            },
          ],
        },
      ],
    });

    await act(async () => {
      root.render(
        React.createElement(
          React.Suspense,
          { fallback: null },
          React.createElement(CommentClient, {
            id: "post-1",
            type: MenuType.CATEGORY,
            queryCommentPromise: treePromise,
          }),
        ),
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain("visible content");
    expect(container.textContent).toContain("banMessage");
    expect(container.textContent).not.toContain("hidden content");
    expect(container.querySelector("ul ul")).not.toBeNull();

    const reply = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent === "form.reply",
    );
    await act(async () => reply?.click());

    expect(scrollTo).toHaveBeenCalledWith(0, 99999);
    expect(container.textContent).toContain("Reply to:");
    expect(container.textContent).toContain("Parent");
    scrollTo.mockRestore();
  });
});
