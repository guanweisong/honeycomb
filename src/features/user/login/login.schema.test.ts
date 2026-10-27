// @vitest-environment node

import { describe, expect, it } from "vitest";

import { CredentialPasswordSchema } from "@/lib/auth/password-policy";

import { LoginSchema } from "@/features/user/login/login.schema.ts";

describe("后台登录输入校验", () => {
  it("接受非空用户名和密码", () => {
    expect(LoginSchema.parse({ name: "admin", password: "123456" })).toEqual({
      name: "admin",
      password: "123456",
    });
  });

  it.each(["      ", "  password  ", "\t\t\t\t\t\t"])(
    "preserves accepted credential characters: %j",
    (password) => {
      const accepted = CredentialPasswordSchema.parse(password);
      expect(
        LoginSchema.parse({ name: "admin", password: accepted }).password,
      ).toBe(password);
    },
  );

  it.each([
    [{ name: "", password: "123456" }, "用户名不能为空"],
    [{ name: "admin", password: "" }, "登录密码不能为空"],
  ])("拒绝空登录字段：%s", (input, message) => {
    expect(() => LoginSchema.parse(input)).toThrow(message);
  });
});
