import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationError } from "@/lib/errors/application-error";
import { UserLevel, UserStatus } from "./user";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
import { getAdminUser } from "./admin-user";

const user = {
  id: "user-1",
  email: null,
  level: UserLevel.ADMIN,
  name: "Admin",
  status: UserStatus.ENABLE,
};

describe("Admin session user query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the session identity directly to the current-user query", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: user.id } });
    const repository = { current: vi.fn().mockResolvedValue(user) };
    await expect(getAdminUser(new Headers(), repository)).resolves.toEqual(
      user,
    );
    expect(repository.current).toHaveBeenCalledExactlyOnceWith(user.id);
  });

  it("does not query without a session", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    const repository = { current: vi.fn() };
    await expect(getAdminUser(new Headers(), repository)).resolves.toBeNull();
    expect(repository.current).not.toHaveBeenCalled();
  });

  it("returns null when the persisted session user no longer exists", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: user.id } });
    const repository = {
      current: vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
    };
    await expect(getAdminUser(new Headers(), repository)).resolves.toBeNull();
  });

  it("returns null for disabled users", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: user.id } });
    const repository = {
      current: vi
        .fn()
        .mockResolvedValue({ ...user, status: UserStatus.DISABLE }),
    };
    await expect(getAdminUser(new Headers(), repository)).resolves.toBeNull();
  });

  it.each([
    new ApplicationError("NOT_FOUND"),
    new Error("database unavailable"),
  ])("preserves unrelated query errors: $message", async (failure) => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: user.id } });
    const repository = { current: vi.fn().mockRejectedValue(failure) };
    await expect(getAdminUser(new Headers(), repository)).rejects.toBe(failure);
  });
});
