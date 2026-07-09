import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { MenuType } from "@/packages/trpc/api/modules/menu/types/menu.type";

const {
  mockToastError,
  mockUseMutation,
  mockUseTranslations,
  mockUseRouter,
  mockUsePathname,
  mockRefreshPath,
} = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseTranslations: vi.fn(),
  mockUseRouter: vi.fn(),
  mockUsePathname: vi.fn(),
  mockRefreshPath: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => mockUseTranslations(),
}));

vi.mock("@/app/(blog)/i18n/navigation", () => ({
  useRouter: () => mockUseRouter(),
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    comment: {
      create: {
        useMutation: () => mockUseMutation(),
      },
    },
  },
}));

vi.mock("@/app/(blog)/libs/refreshPath", () => ({
  refreshPath: (...args: unknown[]) => mockRefreshPath(...args),
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: () => React.createElement("div", { "data-testid": "turnstile" }),
}));

vi.mock("../Card", () => ({
  default: ({
    title,
    children,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    React.createElement("section", { "data-testid": "card" }, title, children),
}));

import CommentClient from "./client";

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
    mockRefreshPath.mockReset();
    mockUseTranslations.mockReturnValue((key: string) => {
      if (key === "captchaRequired") return "请先完成验证码验证";
      return key;
    });
    mockUseRouter.mockReturnValue({
      refresh: vi.fn(),
    });
    mockUsePathname.mockReturnValue("/zh/list/category");
    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
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

    (container.querySelector('input[name="author"]') as HTMLInputElement).value =
      "Alice";
    (container.querySelector('input[name="email"]') as HTMLInputElement).value =
      "alice@example.com";
    (
      container.querySelector('textarea[name="content"]') as HTMLTextAreaElement
    ).value = "Hello world";

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(mockToastError).toHaveBeenCalledWith("请先完成验证码验证");
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
