import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin 身份查询边界", () => {
  it("不直接导入数据库基础设施", () => {
    const source = readFileSync(resolve("src/app/admin/lib/admin-auth.ts"), "utf8");

    expect(source).not.toContain("infrastructure/db");
    expect(source).not.toContain("drizzle-orm");
    expect(source).toContain("application/identity/admin-user");
  });
});
