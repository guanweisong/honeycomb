import React from "react";
import { vi } from "vitest";

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

vi.mock("@/components/SectionCard", () => ({
  default: ({
    title,
    children,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    React.createElement("section", { "data-testid": "card" }, title, children),
}));

export {
  mockToastError,
  mockUseMutation,
  mockUseTranslations,
  mockUseRouter,
  mockUsePathname,
  mockClientEnv,
  mockMutateAsync,
  mockRouterRefresh,
};
