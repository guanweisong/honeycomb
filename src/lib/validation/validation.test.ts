import { describe, expect, it } from "vitest";
import { I18nSchema as InputI18n } from "@/lib/validation/validation";

describe("共享契约的真实消费者", () => {
  it("边界定制完整语言输入错误文案", () => {
    const invalid = InputI18n.safeParse({ en: "", zh: "中文" });
    expect(invalid.error?.issues[0]?.message).toBe("英文不能为空");
  });
});
