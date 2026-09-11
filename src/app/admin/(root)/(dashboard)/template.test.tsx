import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";

const mocks = vi.hoisted(() => ({
  getAdminUser: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/app/admin/lib/admin-auth", () => ({
  getCurrentAdminUser: mocks.getAdminUser,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import AdminRouteTemplate from "./template";

function requestHeaders(pathname: string): Headers {
  return new Headers({ "x-honeycomb-admin-pathname": pathname });
}

describe("AdminRouteTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(requestHeaders("/admin/tag"));
  });

  it("未登录时重定向到登录页", async () => {
    mocks.getAdminUser.mockResolvedValue(null);

    await AdminRouteTemplate({ children: "content" });

    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("已登录但缺少 route capability 时重定向到无权限页", async () => {
    mocks.getAdminUser.mockResolvedValue({
      id: "guest-1",
      email: null,
      level: UserLevel.GUEST,
      name: "Guest",
      status: UserStatus.ENABLE,
    });

    await AdminRouteTemplate({ children: "content" });

    expect(mocks.redirect).toHaveBeenCalledWith("/admin/forbidden");
  });

  it("拥有 route capability 时渲染页面", async () => {
    mocks.getAdminUser.mockResolvedValue({
      id: "editor-1",
      email: null,
      level: UserLevel.EDITOR,
      name: "Editor",
      status: UserStatus.ENABLE,
    });

    await expect(
      AdminRouteTemplate({ children: "content" }),
    ).resolves.toBe("content");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
