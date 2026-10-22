// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  UserInsertSchema,
  UserUpdateSchema,
} from "@/features/user/schema/user.write.schema";

const validUser = {
  name: "administrator",
  email: "admin@example.test",
  password: "123456",
};

describe("admin user write schemas", () => {
  it("isolates invalid update fields from valid identifier validation", () => {
    for (const [field, value] of [
      ["email", "not-an-email"],
      ["password", "12345"],
      ["password", "a".repeat(129)],
    ] as const) {
      const result = UserUpdateSchema.safeParse({
        id: "000000000000000000000001",
        [field]: value,
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.map((issue) => issue.path)).toEqual([
          [field],
        ]);
    }
  });

  it("accepts valid update values with the same identifier and password boundaries", () => {
    for (const password of ["a".repeat(6), "a".repeat(128)]) {
      expect(
        UserUpdateSchema.safeParse({
          id: "000000000000000000000001",
          email: validUser.email,
          password,
        }).success,
      ).toBe(true);
    }
  });

  it("accepts passwords at the shared boundaries", () => {
    expect(UserInsertSchema.safeParse(validUser).success).toBe(true);
    expect(
      UserInsertSchema.safeParse({ ...validUser, password: "a".repeat(128) })
        .success,
    ).toBe(true);
  });

  it("rejects malformed email addresses", () => {
    expect(
      UserInsertSchema.safeParse({ ...validUser, email: "not-an-email" })
        .success,
    ).toBe(false);
    expect(
      UserUpdateSchema.safeParse({
        id: "000000000000000000000001",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("rejects passwords outside the shared boundaries", () => {
    for (const password of ["12345", "a".repeat(129)]) {
      expect(
        UserInsertSchema.safeParse({ ...validUser, password }).success,
      ).toBe(false);
      expect(
        UserUpdateSchema.safeParse({ id: "000000000000000000000001", password })
          .success,
      ).toBe(false);
    }
  });
});

it("normalizes new emails but preserves update spelling for transactional comparison", () => {
  expect(
    UserInsertSchema.parse({
      ...validUser,
      name: "Admin",
      email: " Reader@EXAMPLE.TEST ",
    }),
  ).toMatchObject({ name: "Admin", email: "reader@example.test" });
  expect(
    UserUpdateSchema.parse({
      id: "000000000000000000000001",
      email: "Reader@EXAMPLE.TEST",
    }).email,
  ).toBe("Reader@EXAMPLE.TEST");
  expect(
    UserUpdateSchema.parse({ id: "000000000000000000000001", name: "Admin" }),
  ).not.toHaveProperty("email");
});

it.each(["Üser@example.test", "user@例子.test"])(
  "does not broaden existing email validation for %s",
  (email) => {
    expect(UserInsertSchema.safeParse({ ...validUser, email }).success).toBe(
      false,
    );
  },
);
