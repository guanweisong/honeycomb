import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

const features = ["post", "comment", "user"] as const;

describe("DDD 模块骨架", () => {
  it("核心 feature 具备 domain、service 和 repository 边界", () => {
    for (const feature of features) {
      expect(existsSync(join(process.cwd(), "src/features", feature, "domain"))).toBe(true);
      expect(existsSync(join(process.cwd(), "src/features", feature, `${feature}.service.ts`))).toBe(true);
      expect(existsSync(join(process.cwd(), "src/features", feature, "repository.ts"))).toBe(true);
    }
  });
});
