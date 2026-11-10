// @vitest-environment node
import { expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { UserUpdateSchema } from "@/features/user/schemas/user.write.schema";
import { createUserRepository } from "@/features/user/server/user-repository";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { user } from "@/lib/db/schema";

vi.mock("@/lib/auth/credentials", () => ({ setCredentialPassword: vi.fn() }));

it.each(["create", "update"] as const)(
  "rejects case-insensitive collisions inside the %s transaction before writing",
  async (operation) => {
    const mock = createMockDb();
    mock.from.mockResolvedValue([
      { id: "other", email: "Reader@Example.Test" },
    ]);
    mock.returning.mockResolvedValue([
      { id: "target", level: UserLevel.GUEST, status: UserStatus.ENABLE },
    ]);
    const repository = createUserRepository(asMockDatabase(mock));
    const write =
      operation === "create"
        ? repository.create({
            name: "reader",
            email: "reader@example.test",
            password: "123456",
          })
        : repository.update(
            { id: "target", email: "reader@example.test" },
            UserLevel.ADMIN,
          );
    await expect(write).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mock.transaction).toHaveBeenCalledOnce();
    expect(mock.insert).not.toHaveBeenCalled();
    expect(mock.update).not.toHaveBeenCalled();
  },
);

it("allows an explicit email edit for its own account, normalizes it, and does not rewrite others", async () => {
  const mock = createMockDb();
  mock.from.mockResolvedValue([{ id: "target", email: "Reader@Example.Test" }]);
  mock.returning.mockResolvedValue([
    { id: "target", level: UserLevel.GUEST, status: UserStatus.ENABLE },
  ]);
  await createUserRepository(asMockDatabase(mock)).update(
    {
      id: "target",
      email: "New@Example.Test",
    },
    UserLevel.ADMIN,
  );
  expect(mock.transaction).toHaveBeenCalledOnce();
  expect(mock.set).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ email: "new@example.test" }),
  );
});

it("normalizes a new email inside the write transaction without changing username case", async () => {
  const mock = createMockDb();
  mock.from.mockResolvedValue([]);
  mock.returning.mockResolvedValue([
    { id: "target", level: UserLevel.GUEST, status: UserStatus.ENABLE },
  ]);
  await createUserRepository(asMockDatabase(mock)).create({
    name: "Admin",
    email: "Reader@EXAMPLE.TEST",
    password: "123456",
  });
  expect(mock.transaction).toHaveBeenCalledOnce();
  expect(mock.values).toHaveBeenCalledWith(
    expect.objectContaining({
      email: "reader@example.test",
      name: "Admin",
      username: "Admin",
    }),
  );
  expect(mock.from.mock.invocationCallOrder[0]).toBeLessThan(
    mock.insert.mock.invocationCallOrder[0] ?? 0,
  );
});

it("does not normalize or scan emails on an unrelated account update", async () => {
  const mock = createMockDb();
  mock.where.mockResolvedValueOnce([
    { status: UserStatus.ENABLE, level: UserLevel.GUEST },
  ]);
  mock.returning.mockResolvedValue([
    { id: "target", level: UserLevel.GUEST, status: UserStatus.ENABLE },
  ]);
  await createUserRepository(asMockDatabase(mock)).update(
    {
      id: "target",
      status: UserStatus.ENABLE,
    },
    UserLevel.ADMIN,
  );
  expect(mock.select).toHaveBeenCalledExactlyOnceWith({
    level: user.level,
    name: user.name,
    status: user.status,
  });
  expect(mock.delete).not.toHaveBeenCalled();
  expect(mock.set).toHaveBeenCalledExactlyOnceWith(
    expect.not.objectContaining({ email: expect.anything() }),
  );
});

it("preserves an unchanged legacy email echoed by the full form during a name edit", async () => {
  const mock = createMockDb();
  const id = "000000000000000000000001";
  mock.from.mockReturnValueOnce(mock).mockResolvedValueOnce([
    { id, email: "Reader@Example.Test" },
    { id: "other", email: "reader@example.test" },
  ]);
  mock.where.mockResolvedValueOnce([
    { name: "Before", level: UserLevel.GUEST },
  ]);
  mock.returning.mockResolvedValue([
    {
      id,
      level: UserLevel.GUEST,
      status: UserStatus.ENABLE,
      email: "Reader@Example.Test",
    },
  ]);
  await createUserRepository(asMockDatabase(mock)).update(
    UserUpdateSchema.parse({ id, name: "After", email: "Reader@Example.Test" }),
    UserLevel.ADMIN,
  );
  expect(mock.set).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ name: "After", email: "Reader@Example.Test" }),
  );
});
