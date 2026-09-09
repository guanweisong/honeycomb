import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CREDENTIAL_PASSWORD_MAX_LENGTH,
  CREDENTIAL_PASSWORD_MIN_LENGTH,
} from "@/packages/identity/auth/password-policy";

describe("已接受安全风险的一致性", () => {
  const read = (path: string) => readFileSync(path, "utf8");

  it("六位密码下限在配置和风险文档中保持一致", () => {
    const authSource = read("src/auth.ts");
    expect(CREDENTIAL_PASSWORD_MIN_LENGTH).toBe(6);
    expect(CREDENTIAL_PASSWORD_MAX_LENGTH).toBe(128);
    expect(authSource).toContain(
      "minPasswordLength: CREDENTIAL_PASSWORD_MIN_LENGTH",
    );
    expect(authSource).toContain(
      "maxPasswordLength: CREDENTIAL_PASSWORD_MAX_LENGTH",
    );
    expect(read("README.md")).toMatch(/六位密码[\s\S]{0,160}已接受风险/);
  });

  it("CSP unsafe-inline 在配置和风险文档中保持一致", () => {
    expect(read("src/packages/infrastructure/security/security-headers.ts"))
      .toContain('"\'unsafe-inline\'"');
    expect(read("README.md")).toMatch(/unsafe-inline[\s\S]{0,160}已接受风险/);
  });
});
