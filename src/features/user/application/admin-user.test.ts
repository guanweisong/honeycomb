import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("./user-queries", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { getAdminUser } from "./admin-user";

describe("应用层 Admin 用户查询", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("只返回启用用户并把会话用户 ID 交给用户查询用例", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "user-1" } });
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: "user-1", email: null, level: "ADMIN", name: "Admin", status: "ENABLE",
    });

    const repository = {} as never;
    await expect(getAdminUser(new Headers(), repository)).resolves.toMatchObject({ id: "user-1" });
    expect(mocks.getCurrentUser).toHaveBeenCalledWith(repository, "user-1");
  });

  it("没有会话时不访问数据库", async () => {
    mocks.getSession.mockResolvedValueOnce(null);

    await expect(getAdminUser(new Headers(), {} as never)).resolves.toBeNull();
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });
});
