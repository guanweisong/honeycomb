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
    const invalidator = {
      invalidate: vi.fn(async () => {
        order.push("cache");
      }),
    };

    await expect(
      destroyMedia(repository, storage, ["media-1"], invalidator),
    ).resolves.toEqual({ success: true });
    expect(order).toEqual(["find", "storage", "database", "cache"]);
    expect(invalidator.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshPostIndex: true,
    });
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
      destroyMedia(repository, storage, ["media-1"], { invalidate: vi.fn() }),
    ).rejects.toThrow("storage failed");
    expect(repository.deleteRecords).not.toHaveBeenCalled();
  });

  it("repairs public caches when a non-empty deletion retry finds no targets", async () => {
    const repository = {
      findDeleteTargets: vi.fn().mockResolvedValue([]),
      deleteRecords: vi.fn(),
    };
    const storage = { deleteObjects: vi.fn() };
    const invalidator = { invalidate: vi.fn() };

    await expect(
      destroyMedia(repository, storage, ["missing"], invalidator),
    ).resolves.toEqual({ success: true });
    expect(storage.deleteObjects).not.toHaveBeenCalled();
    expect(repository.deleteRecords).not.toHaveBeenCalled();
    expect(invalidator.invalidate).toHaveBeenCalledWith({
      refreshLayout: true,
      refreshPostIndex: true,
    });
  });

  it("treats an empty id set as success without side effects", async () => {
    const repository = {
      findDeleteTargets: vi.fn().mockResolvedValue([]),
      deleteRecords: vi.fn(),
    };
    const storage = { deleteObjects: vi.fn() };
    const invalidator = { invalidate: vi.fn() };

    await expect(
      destroyMedia(repository, storage, [], invalidator),
    ).resolves.toEqual({ success: true });
    expect(storage.deleteObjects).not.toHaveBeenCalled();
    expect(repository.deleteRecords).not.toHaveBeenCalled();
    expect(invalidator.invalidate).not.toHaveBeenCalled();
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
    const invalidator = { invalidate: vi.fn().mockResolvedValue(undefined) };

    await expect(
      destroyMedia(repository, storage, ["media-1"], invalidator),
    ).rejects.toThrow("database failed");
    await expect(
      destroyMedia(repository, storage, ["media-1"], invalidator),
    ).resolves.toEqual({ success: true });
    expect(storage.deleteObjects).toHaveBeenCalledTimes(2);
  });
});
