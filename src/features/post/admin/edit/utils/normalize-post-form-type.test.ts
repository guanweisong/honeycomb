import { expect, expectTypeOf, it } from "vitest";
import { PostStatus } from "@/packages/domain/content/post-status";
import { normalizePostForm } from "./normalize-post-form";

it("replaces the input status in both the result type and submitted value", () => {
  const result = normalizePostForm(
    { status: PostStatus.DRAFT, coverId: "cover" } as const,
    PostStatus.PUBLISHED,
  );
  if (!result.ok) throw new Error("Expected a valid covered post");
  expectTypeOf(result.data.status).toEqualTypeOf<PostStatus>();
  expectTypeOf(result.data.coverId).toEqualTypeOf<"cover">();
  expect(result.data.status).toBe(PostStatus.PUBLISHED);
});
