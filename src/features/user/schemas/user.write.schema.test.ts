import { describe, expect, it } from "vitest";

import { UserInsertSchema } from "./user.insert.schema";
import { UserUpdateSchema } from "./user.update.schema";

const validUser = {
  name: "administrator",
  email: "admin@example.test",
  password: "123456",
};

describe("admin user write schemas", () => {
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
      UserUpdateSchema.safeParse({ id: "user-id", email: "not-an-email" })
        .success,
    ).toBe(false);
  });

  it("rejects passwords outside the shared boundaries", () => {
    for (const password of ["12345", "a".repeat(129)]) {
      expect(
        UserInsertSchema.safeParse({ ...validUser, password }).success,
      ).toBe(false);
      expect(
        UserUpdateSchema.safeParse({ id: "user-id", password }).success,
      ).toBe(false);
    }
  });
});
