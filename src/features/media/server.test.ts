// @vitest-environment node
import { expect, it, vi } from "vitest";
import { destroyMedia } from "./server";
import {
  mediaRepositoryFixture,
  mediaStorageFixture,
  mediaRow,
} from "@tests/helpers/media-lifecycle";
const cache = {
  invalidate: vi.fn(async () => ({ state: "completed" as const })),
};
it("marks deletion before storage and retains a tombstone instead of removing the row", async () => {
  const repo = mediaRepositoryFixture(mediaRow({ state: "READY" }));
  const storage = mediaStorageFixture();
  storage.headObject
    .mockResolvedValueOnce({ size: 1, type: "image/png" })
    .mockResolvedValue(null);
  expect(
    await destroyMedia(repo, storage, ["id"], cache, "actor", true),
  ).toEqual({ success: true, publicSync: "completed" });
  expect(repo.beginDelete.mock.invocationCallOrder[0]).toBeLessThan(
    storage.deleteObjects.mock.invocationCallOrder[0] ?? 0,
  );
  expect(repo.finishDelete).toHaveBeenCalledWith("111111111111111111111111");
});
it("retains recovery state on storage or final database uncertainty", async () => {
  for (const phase of ["storage", "database"]) {
    const repo = mediaRepositoryFixture(mediaRow({ state: "DELETING" }));
    const storage = mediaStorageFixture();
    if (phase === "storage")
      storage.headObject.mockRejectedValue(new Error("unknown"));
    else repo.finishDelete.mockRejectedValue(new Error("unknown"));
    expect(
      (await destroyMedia(repo, storage, ["id"], cache, "actor", true)).success,
    ).toBe(false);
    expect(repo.note).toHaveBeenCalledWith(
      "111111111111111111111111",
      "DELETING",
      "DELETE_PENDING",
    );
  }
});
it("absence converges without repeating external delete", async () => {
  const repo = mediaRepositoryFixture(mediaRow({ state: "DELETING" }));
  const storage = mediaStorageFixture();
  expect(
    (await destroyMedia(repo, storage, ["id"], cache, "actor", true)).success,
  ).toBe(true);
  expect(storage.deleteObjects).not.toHaveBeenCalled();
});
