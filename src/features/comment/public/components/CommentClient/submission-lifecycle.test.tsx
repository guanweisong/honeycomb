import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MenuType } from "@/features/menu/menu-types";
import { CommentStatus } from "@/features/comment/comment-status";

const {
  mockToastError,
  mockUseMutation,
  mockUseTranslations,
  mockUseRouter,
  mockUsePathname,
  mockClientEnv,
  mockMutateAsync,
  mockRouterRefresh,
} = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseTranslations: vi.fn(),
  mockUseRouter: vi.fn(),
  mockUsePathname: vi.fn(),
  mockClientEnv: {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined as string | undefined,
  },
  mockMutateAsync: vi.fn(),
  mockRouterRefresh: vi.fn(),
}));

vi.mock("@/env/client", () => ({
  clientEnv: mockClientEnv,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => mockUseTranslations(),
}));

vi.mock("@/lib/i18n/blog-navigation", () => ({
  useRouter: () => mockUseRouter(),
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    comment: {
      create: {
        useMutation: () => mockUseMutation(),
      },
    },
  },
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) =>
    React.createElement(
      "button",
      {
        type: "button",
        "data-testid": "turnstile",
        onClick: () => onSuccess("test-captcha-token"),
      },
      "captcha",
    ),
}));

vi.mock("@/components/blog/Card", () => ({
  default: ({
    title,
    children,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    React.createElement("section", { "data-testid": "card" }, title, children),
}));

import CommentClient from "./index";

const commentPromise = Promise.resolve({ total: 0, list: [] });

describe("comment draft preservation during submission", () => {
  let container: HTMLDivElement;
  let root: Root;
  let resolveSubmission: (result: { id: string }) => void;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    mockClientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = undefined;
    mockToastError.mockReset();
    mockRouterRefresh.mockReset();
    mockMutateAsync.mockReset();
    mockUseTranslations.mockReturnValue((key: string) => key);
    mockUseRouter.mockReturnValue({ refresh: mockRouterRefresh });
    mockUsePathname.mockReturnValue("/zh/list/category");
    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    mockMutateAsync.mockReturnValue(
      new Promise<{ id: string }>((resolve) => {
        resolveSubmission = resolve;
      }),
    );
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const tree = Promise.resolve({
      total: 1,
      list: [
        {
          id: "parent",
          author: "Parent",
          content: "Existing comment",
          site: null,
          parentId: null,
          status: CommentStatus.PUBLISH,
          createdAt: null,
          avatar: "/logo.jpg",
          children: [],
        },
      ],
    });
    await act(async () => {
      root.render(
        <CommentClient
          id="post-1"
          type={MenuType.CATEGORY}
          queryCommentPromise={tree}
        />,
      );
    });
    field("author").value = "Alice";
    field("email").value = "alice@example.com";
    field("content").value = "First draft";
  });

  afterEach(async () => {
    expect(container.querySelector('[data-testid="card"]')).not.toBeNull();
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function field(name: string) {
    const element = container.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(`[name="${name}"]`);
    if (!element) throw new Error(`Missing field ${name}`);
    return element;
  }

  async function submit() {
    await act(async () =>
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
  }

  async function finish() {
    await act(async () => resolveSubmission({ id: "created-comment" }));
  }

  it("keeps new text entered while the previous draft is saving", async () => {
    await submit();
    await act(async () => {
      field("content").value = "Second draft";
      field("content").dispatchEvent(new Event("input", { bubbles: true }));
    });
    await finish();
    expect(field("content").value).toBe("Second draft");
    expect(mockRouterRefresh).toHaveBeenCalledOnce();
  });

  it("keeps a newly selected reply target after an older submission succeeds", async () => {
    await submit();
    const reply = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "form.reply",
    );
    await act(async () => reply?.click());
    await finish();
    expect(container.textContent).toContain("Reply to:");
    expect(field("content").value).toBe("First draft");
  });

  it("does not restore a saved identity after the user quits during submission", async () => {
    // Establish the saved identity through the first successful submission.
    await submit();
    await finish();
    expect(container.textContent).toContain("welcomeBack: Alice");
    mockMutateAsync.mockReturnValue(
      new Promise<{ id: string }>((resolve) => {
        resolveSubmission = resolve;
      }),
    );
    field("content").value = "Another comment";
    await submit();
    const quit = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("quit"),
    );
    await act(async () => quit?.click());
    field("author").value = "Bob";
    field("email").value = "bob@example.com";
    await finish();
    expect(field("author").value).toBe("Bob");
    expect(field("email").value).toBe("bob@example.com");
    expect(container.textContent).not.toContain("welcomeBack: Alice");
  });

  it("clears an unchanged submitted draft and remembers its identity", async () => {
    await submit();
    await finish();
    expect(field("content").value).toBe("");
    expect(container.textContent).toContain("welcomeBack: Alice");
    expect(JSON.parse(localStorage.getItem("user") ?? "null")).toEqual({
      author: "Alice",
      email: "alice@example.com",
    });
  });

  it("keeps a successful comment successful when identity storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("No storage", "SecurityError");
    });
    await submit();
    await finish();
    expect(container.textContent).toContain("welcomeBack: Alice");
    expect(field("content").value).toBe("");
    expect(mockRouterRefresh).toHaveBeenCalledOnce();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("keeps submission pending until the asynchronous request settles", async () => {
    await submit();
    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
    await finish();
    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(false);
  });

  it.each([
    { error: { data: { code: "BAD_REQUEST" } }, feedback: "submitRejected" },
    { error: new Error("network disconnected"), feedback: "submitUnknown" },
    {
      error: { data: { code: "INTERNAL_SERVER_ERROR" } },
      feedback: "submitUnknown",
    },
  ])(
    "shows $feedback without losing the draft and resets verification",
    async ({ error, feedback }) => {
      mockClientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key";
      await act(async () =>
        root.render(
          <CommentClient
            id="post-1"
            type={MenuType.CATEGORY}
            queryCommentPromise={commentPromise}
          />,
        ),
      );
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>('[data-testid="turnstile"]')
          ?.click(),
      );
      mockMutateAsync.mockRejectedValueOnce(error);
      await submit();
      expect(mockToastError).toHaveBeenCalledExactlyOnceWith(feedback);
      expect(field("content").value).toBe("First draft");
      expect(field("author").value).toBe("Alice");
      expect(mockRouterRefresh).not.toHaveBeenCalled();
      expect(
        container.querySelector<HTMLButtonElement>('button[type="submit"]')
          ?.disabled,
      ).toBe(false);
      await submit();
      expect(mockToastError).toHaveBeenLastCalledWith("captchaRequired");
      expect(mockMutateAsync).toHaveBeenCalledOnce();
    },
  );
});
