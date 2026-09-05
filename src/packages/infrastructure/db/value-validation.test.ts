import { describe, expect, it } from "vitest";
import { parseEnumValue, requireWriteResult } from "./value-validation";

describe("持久化返回契约", () => {
  it("保留合法枚举并拒绝未知值和空值", () => {
    expect(parseEnumValue("DRAFT", ["DRAFT", "PUBLISHED"], "status")).toBe("DRAFT");
    for (const value of [null, undefined, "invalid", 1]) {
      expect(() => parseEnumValue(value, ["DRAFT", "PUBLISHED"], "status"))
        .toThrow(expect.objectContaining({ code: "INTERNAL_SERVER_ERROR" }));
    }
  });

  it("返回已写入记录，创建空结果属于基础设施错误", () => {
    const row = { id: "post-1" };
    expect(requireWriteResult(row, "create", "post")).toBe(row);
    expect(() => requireWriteResult(undefined, "create", "post"))
      .toThrow(expect.objectContaining({ code: "INTERNAL_SERVER_ERROR" }));
  });

  it("更新未命中明确返回不存在错误", () => {
    expect(() => requireWriteResult(undefined, "update", "post"))
      .toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });
});
