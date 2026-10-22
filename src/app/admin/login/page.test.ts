// @vitest-environment node
import { isValidElement, Suspense, type ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingViewModel } from "@/features/setting/types/setting.record";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";

const mocks = vi.hoisted(() => ({
  headers: vi.fn<typeof import("next/headers").headers>(),
  getAdminUser:
    vi.fn<typeof import("@/app/admin/lib/admin-auth").getAdminUser>(),
  getSiteSetting:
    vi.fn<typeof import("@/app/lib/server/site-setting").getSiteSetting>(),
  getAuthProviders:
    vi.fn<typeof import("@/app/admin/lib/auth-providers").getAuthProviders>(),
  redirect: vi.fn<(path: string) => never>(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/app/admin/lib/admin-auth", () => ({
  getAdminUser: mocks.getAdminUser,
}));
vi.mock("@/app/lib/server/site-setting", () => ({
  getSiteSetting: mocks.getSiteSetting,
}));
vi.mock("@/app/admin/lib/auth-providers", () => ({
  getAuthProviders: mocks.getAuthProviders,
}));
vi.mock("@/features/user/login/components/LoginClient", () => ({
  default: () => null,
}));
vi.mock("@/components/LoadingState", () => ({ default: () => null }));

import LoginClient from "@/features/user/login/components/LoginClient";
import LoginPage from "./page";

type LoginPageProps = Parameters<typeof LoginPage>[0];

const setting = {
  id: "site-setting",
  version: 1,
  siteName: { zh: "蜂巢", en: "Honeycomb" },
  siteSubName: null,
  siteSignature: null,
  siteCopyright: null,
  siteRecordNo: null,
  siteRecordUrl: null,
  createdAt: null,
  updatedAt: null,
} satisfies SettingViewModel;

const providers = [{ id: "github", name: "GitHub" }] satisfies ReturnType<
  typeof mocks.getAuthProviders
>;

/** Invoke the real async server child without rendering the client boundary. */
async function renderLogin(
  searchParams: Awaited<LoginPageProps["searchParams"]> = {},
) {
  const page = LoginPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  });
  expect(page.type).toBe(Suspense);
  const content: unknown = page.props.children;
  if (
    !isValidElement<Pick<LoginPageProps, "searchParams">>(content) ||
    typeof content.type !== "function"
  ) {
    throw new Error("Expected the login server component inside Suspense");
  }

  const result: unknown = await Reflect.apply(content.type, undefined, [
    content.props,
  ]);
  if (!isValidElement<ComponentProps<typeof LoginClient>>(result)) {
    throw new Error("Expected the login client boundary");
  }
  expect(result.type).toBe(LoginClient);
  return result.props;
}

describe("login server page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getAdminUser.mockResolvedValue(null);
    mocks.getSiteSetting.mockResolvedValue(setting);
    mocks.getAuthProviders.mockReturnValue(providers);
    mocks.redirect.mockImplementation((path) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it.each([
    ["anonymous request without a request ID", new Headers()],
    [
      "anonymous request with a request ID",
      new Headers({ "x-request-id": "login-request" }),
    ],
    ["rejected session", new Headers({ cookie: "session=expired" })],
  ])(
    "separates authentication from public settings for %s",
    async (_, headers) => {
      mocks.headers.mockResolvedValue(headers);

      const props = await renderLogin({
        targetUrl: "/admin/post?draft=1#editor",
      });

      expect(mocks.headers).toHaveBeenCalledExactlyOnceWith();
      expect(mocks.getAdminUser).toHaveBeenCalledExactlyOnceWith(headers);
      expect(mocks.getAdminUser.mock.calls[0]?.[0]).toBe(headers);
      expect(mocks.getSiteSetting).toHaveBeenCalledExactlyOnceWith();
      expect(mocks.getAuthProviders).toHaveBeenCalledExactlyOnceWith();
      expect(mocks.redirect).not.toHaveBeenCalled();
      expect(props).toEqual({
        setting,
        providers,
        targetUrl: "/admin/post?draft=1#editor",
      });
    },
  );

  it("redirects an authenticated user before reading login data", async () => {
    const headers = new Headers({ cookie: "session=valid" });
    mocks.headers.mockResolvedValue(headers);
    mocks.getAdminUser.mockResolvedValue({
      id: "admin-user",
      email: null,
      name: "Admin",
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });

    await expect(renderLogin({ targetUrl: "/admin/post" })).rejects.toThrow(
      "redirect:/admin/dashboard",
    );

    expect(mocks.getAdminUser).toHaveBeenCalledExactlyOnceWith(headers);
    expect(mocks.getAdminUser.mock.calls[0]?.[0]).toBe(headers);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/admin/dashboard");
    expect(mocks.getSiteSetting).not.toHaveBeenCalled();
    expect(mocks.getAuthProviders).not.toHaveBeenCalled();
  });

  it.each([undefined, "https://evil.test", "/admin/../blog", ["/admin/post"]])(
    "normalizes unsafe or missing callback %j",
    async (targetUrl) => {
      expect((await renderLogin({ targetUrl })).targetUrl).toBe(
        "/admin/dashboard",
      );
    },
  );

  it("passes missing settings and no configured providers to the client", async () => {
    mocks.getSiteSetting.mockResolvedValue(undefined);
    mocks.getAuthProviders.mockReturnValue([]);

    expect(await renderLogin()).toEqual({
      setting: undefined,
      providers: [],
      targetUrl: "/admin/dashboard",
    });
  });
});
