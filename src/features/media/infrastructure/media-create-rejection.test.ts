import { expect, it } from "vitest";
import { createMediaRepository } from "./media-repository";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { MediaCreateRejectedError } from "../application/upload-result";

const input = {
  name: "image.png",
  type: "image/png" as const,
  size: 1,
  key: "image.png",
};
it("identifies a definite SQLite constraint rejection through the Drizzle cause", async () => {
  const db = createMockDb();
  const constraint = Object.assign(new Error("constraint"), {
    code: "SQLITE_CONSTRAINT_UNIQUE",
  });
  db.returning.mockRejectedValue(
    new Error("query failed", { cause: constraint }),
  );
  await expect(
    createMediaRepository(asMockDatabase(db)).create(input),
  ).rejects.toBeInstanceOf(MediaCreateRejectedError);
});
it("preserves an ambiguous database transport error without labeling it rejected", async () => {
  const db = createMockDb();
  const failure = Object.assign(new Error("response lost"), {
    code: "SERVER_ERROR",
  });
  db.returning.mockRejectedValue(failure);
  await expect(
    createMediaRepository(asMockDatabase(db)).create(input),
  ).rejects.toBe(failure);
});
