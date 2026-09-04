import { describe, expect, it, vi } from "vitest";

import { destroyMedia } from "./media-use-cases";

describe("destroyMedia", () => {
  it("deletes storage objects before database records", async () => {
    const order: string[] = [];
    const repository = {
      findDeleteTargets: vi.fn(async () => {
        order.push("find");
        return [{ id: "media-1", key: "image.jpg" }];
      }),
      deleteRecords: vi.fn(async () => {
        order.push("database");
        return { success: true as const };
      }),
    };
    const storage = {
      deleteObjects: vi.fn(async () => {
        order.push("storage");
      }),
    };

    await expect(
      destroyMedia(repository, storage, ["media-1"]),
    ).resolves.toEqual({ success: true });
    expect(order).toEqual(["find", "storage", "database"]);
  });

  it("keeps database records when storage deletion fails", async () => {
    const repository = {
      findDeleteTargets: vi
        .fn()
        .mockResolvedValue([{ id: "media-1", key: "image.jpg" }]),
      deleteRecords: vi.fn(),
    };
    const storage = {
      deleteObjects: vi.fn().mockRejectedValue(new Error("storage failed")),
    };

    await expect(
      destroyMedia(repository, storage, ["media-1"]),
    ).rejects.toThrow("storage failed");
    expect(repository.deleteRecords).not.toHaveBeenCalled();
  });

  it("treats empty targets as an idempotent success", async () => {
    const repository = {
      findDeleteTargets: vi.fn().mockResolvedValue([]),
      deleteRecords: vi.fn(),
    };
    const storage = { deleteObjects: vi.fn() };

    await expect(
      destroyMedia(repository, storage, ["missing"]),
    ).resolves.toEqual({ success: true });
    expect(storage.deleteObjects).not.toHaveBeenCalled();
    expect(repository.deleteRecords).not.toHaveBeenCalled();
  });

  it("can retry after storage succeeded but database deletion failed", async () => {
    const repository = {
      findDeleteTargets: vi
        .fn()
        .mockResolvedValue([{ id: "media-1", key: "image.jpg" }]),
      deleteRecords: vi
        .fn()
        .mockRejectedValueOnce(new Error("database failed"))
        .mockResolvedValueOnce({ success: true as const }),
    };
    const storage = { deleteObjects: vi.fn().mockResolvedValue(undefined) };

    await expect(
      destroyMedia(repository, storage, ["media-1"]),
    ).rejects.toThrow("database failed");
    await expect(
      destroyMedia(repository, storage, ["media-1"]),
    ).resolves.toEqual({ success: true });
    expect(storage.deleteObjects).toHaveBeenCalledTimes(2);
  });
});
