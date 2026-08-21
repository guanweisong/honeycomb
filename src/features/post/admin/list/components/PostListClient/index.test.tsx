import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PostListClient boundary", () => {
  it("keeps list queries and mutations in the client shell", () => {
    const source = readFileSync(
      resolve(
        "src/features/post/admin/list/components/PostListClient/index.tsx",
      ),
      "utf8",
    );
    expect(source).toContain('"use client"');
    expect(source).toContain("trpc.post.adminIndex.useQuery");
    expect(source).toContain("trpc.post.destroy.useMutation");
  });
});
