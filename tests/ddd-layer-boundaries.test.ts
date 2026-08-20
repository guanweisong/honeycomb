import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const features = ["category", "comment", "link", "media", "menu", "page", "post", "setting", "tag", "user"];

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return files(path);
    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}

describe("DDD 分层边界", () => {
  it("domain 不依赖 infrastructure 或数据库实现", () => {
    const violations = features.flatMap((feature) => {
      const directory = join(process.cwd(), "src/features", feature, "domain");
      return existsSync(directory) ? files(directory).flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return /infrastructure\/|drizzle-orm|packages\/infrastructure/.test(source) ? [path] : [];
      }) : [];
    });
    expect(violations).toEqual([]);
  });
});
