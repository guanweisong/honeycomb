// @vitest-environment node
import { expect, it } from "vitest";
import {
  MediaUploadFileSchema,
  MediaUploadIntentInputSchema,
} from "./upload-policy";
import { MediaRegisterUploadSchema, MediaListQuerySchema } from "./schema";
it.each(["file.html", "file.svg", "file.jpg", "file"])(
  "rejects filename/MIME mismatch %s",
  (name) => {
    expect(
      MediaUploadFileSchema.safeParse({ name, type: "image/png", size: 10 })
        .success,
    ).toBe(false);
  },
);
it.each([
  { name: "a.svg", type: "image/svg+xml", size: 1 },
  { name: "a.png", type: "image/png", size: 20971521 },
])("rejects unsupported or oversized input", (input) => {
  expect(MediaUploadFileSchema.safeParse(input).success).toBe(false);
});
it("requires a lowercase SHA-256 while preserving file rules", () => {
  const input = { name: "a.png", type: "image/png", size: 1 };
  expect(
    MediaUploadIntentInputSchema.safeParse({ ...input, sha256: "a".repeat(64) })
      .success,
  ).toBe(true);
  for (const sha256 of [
    undefined,
    "A".repeat(64),
    "a".repeat(63),
    "g".repeat(64),
  ])
    expect(
      MediaUploadIntentInputSchema.safeParse({ ...input, sha256 }).success,
    ).toBe(false);
  expect(
    MediaUploadIntentInputSchema.safeParse({
      ...input,
      name: "a.jpg",
      sha256: "a".repeat(64),
    }).success,
  ).toBe(false);
});
it("registers signed intent only and has no lifecycle query fields", () => {
  expect(
    MediaRegisterUploadSchema.parse({
      intent: "signed",
      id: "old",
      key: "final",
    }),
  ).toEqual({ intent: "signed" });
  expect(MediaRegisterUploadSchema.safeParse({ intent: "" }).success).toBe(
    false,
  );
  expect(MediaListQuerySchema.parse({ state: "READY" })).toEqual({
    page: 1,
    limit: 10,
    sortField: "updatedAt",
    sortOrder: "desc",
  });
});
