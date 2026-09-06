import { describe, expect, it } from "vitest";

import { LoginSchema } from "./login.schema";

describe("后台登录输入校验", () => {
  it("接受非空用户名和密码", () => {
    expect(LoginSchema.parse({ name: "admin", password: "123456" })).toEqual({
      name: "admin",
      password: "123456",
    });
  });

  it.each([
    [{ name: "", password: "123456" }, "用户名不能为空"],
    [{ name: "admin", password: "" }, "登录密码不能为空"],
  ])("拒绝空登录字段：%s", (input, message) => {
    expect(() => LoginSchema.parse(input)).toThrow(message);
  });
});
