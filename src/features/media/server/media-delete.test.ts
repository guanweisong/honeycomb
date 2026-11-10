// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { destroyMedia } from "@/features/media/server/media-delete";
import {
  mediaRow,
  mediaRepositoryFixture,
  mediaStorageFixture,
} from "@tests/helpers/media-registration";
const cache = {
  invalidate: vi.fn(async () => ({ state: "completed" as const })),
};
it("deletes storage and confirms absence inside the repository transaction", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  storage.headObject.mockResolvedValue(null);
  expect(
    await destroyMedia(repo, storage, ["id"], cache, "actor", true),
  ).toEqual({ success: true, publicSync: "completed" });
  expect(storage.deleteObjects).toHaveBeenCalledWith(
    ["media/final.png"],
    expect.any(AbortSignal),
  );
});
it("reports partial or unknown deletion without promising rollback", async () => {
  for (const phase of ["storage", "database"]) {
    const repo = mediaRepositoryFixture();
    const storage = mediaStorageFixture();
    if (phase === "storage")
      storage.headObject.mockRejectedValue(new Error("unknown"));
    else repo.deleteWithStorage.mockRejectedValue(new Error("unknown"));
    await expect(
      destroyMedia(repo, storage, ["id"], cache, "actor", true),
    ).rejects.toThrow("部分删除");
  }
});
it("requires risk acknowledgment before touching storage or persistence", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  await expect(
    destroyMedia(repo, storage, ["id"], cache, "actor", false),
  ).rejects.toThrow("未登记");
  expect(repo.deleteWithStorage).not.toHaveBeenCalled();
});
it("idempotently bulk deletes an already absent object", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  await destroyMedia(repo, storage, ["id"], cache, "actor", true);
  expect(storage.deleteObjects).toHaveBeenCalledExactlyOnceWith(
    ["media/final.png"],
    expect.any(AbortSignal),
  );
  expect(storage.headObject).toHaveBeenCalledExactlyOnceWith(
    "media/final.png",
    expect.any(AbortSignal),
  );
});
it("keeps committed deletion successful when public cache refresh fails", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  const invalidator = {
    invalidate: vi.fn().mockRejectedValue(new Error("offline")),
  };
  expect(
    await destroyMedia(repo, storage, ["id"], invalidator, "actor", true),
  ).toEqual({ success: true, publicSync: "degraded" });
});

it("bulk deletes unique keys after reference checks and verifies before row deletion", async () => {
  const repo = mediaRepositoryFixture();
  const storage = mediaStorageFixture();
  const events: string[] = [];
  repo.deleteWithStorage.mockImplementation(async (_ids, _actor, remove) => {
    events.push("references checked");
    await remove(["a", "b", "a"].map((key) => mediaRow({ key })));
    events.push("rows deleted");
  });
  storage.deleteObjects.mockImplementation(async () => {
    events.push("bulk delete");
  });
  storage.headObject.mockImplementation(async (key) => {
    events.push(`head ${key}`);
    return null;
  });
  await destroyMedia(repo, storage, ["id"], cache, "actor", true);
  expect(storage.deleteObjects).toHaveBeenCalledExactlyOnceWith(
    ["a", "b"],
    expect.any(AbortSignal),
  );
  expect(events).toEqual([
    "references checked",
    "bulk delete",
    "head a",
    "head b",
    "rows deleted",
  ]);
});
it("does not contact storage for an empty repository batch", async () => {
  const repo = mediaRepositoryFixture();
  repo.deleteWithStorage.mockImplementation(async (_ids, _actor, remove) => {
    await remove([]);
  });
  const storage = mediaStorageFixture();
  await destroyMedia(repo, storage, [], cache, "actor", true);
  expect(storage.deleteObjects).not.toHaveBeenCalled();
  expect(storage.headObject).not.toHaveBeenCalled();
});
it("verifies a large batch in full chunks of at most eight HEADs", async () => {
  const keys = Array.from({ length: 17 }, (_, i) => `media/${i}.png`);
  const repo = mediaRepositoryFixture();
  repo.deleteWithStorage.mockImplementation(async (_ids, _actor, remove) => {
    await remove(keys.map((key) => mediaRow({ key })));
  });
  const storage = mediaStorageFixture();
  let active = 0;
  let maxActive = 0;
  const release: (() => void)[] = [];
  storage.headObject.mockImplementation(async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise<void>((resolve) => {
      release.push(resolve);
    });
    active--;
    return null;
  });
  const deletion = destroyMedia(repo, storage, keys, cache, "actor", true);
  for (const chunkSize of [8, 8, 1]) {
    await vi.waitFor(() => expect(release).toHaveLength(chunkSize));
    expect(active).toBe(chunkSize);
    const chunk = release.splice(0);
    for (const resolve of chunk.slice(1)) resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(release).toHaveLength(0);
    requireDefined(chunk[0])();
  }
  await deletion;
  expect(maxActive).toBe(8);
  expect(active).toBe(0);
  expect(storage.deleteObjects).toHaveBeenCalledExactlyOnceWith(
    keys,
    expect.any(AbortSignal),
  );
  expect(storage.headObject).toHaveBeenCalledTimes(keys.length);
});
it.each(["unknown", "present"])(
  "settles every started HEAD before reporting %s verification failure",
  async (failure) => {
    const keys = Array.from({ length: 9 }, (_, i) => `media/${i}.png`);
    const repo = mediaRepositoryFixture();
    let rowsDeleted = false;
    repo.deleteWithStorage.mockImplementation(async (_ids, _actor, remove) => {
      await remove(keys.map((key) => mediaRow({ key })));
      rowsDeleted = true;
    });
    const storage = mediaStorageFixture();
    const release: (() => void)[] = [];
    storage.headObject.mockImplementation(async (key) => {
      if (key === keys[0]) {
        if (failure === "unknown") throw new Error("unknown");
        return { size: 1, type: "image/png" };
      }
      await new Promise<void>((resolve) => {
        release.push(resolve);
      });
      return null;
    });
    let settled = false;
    const deletion = destroyMedia(
      repo,
      storage,
      keys,
      cache,
      "actor",
      true,
    ).finally(() => {
      settled = true;
    });
    const rejected = expect(deletion).rejects.toThrow("部分删除");
    await vi.waitFor(() => expect(storage.headObject).toHaveBeenCalledTimes(8));
    expect(settled).toBe(false);
    expect(release).toHaveLength(7);
    for (const resolve of release) resolve();
    await rejected;
    expect(rowsDeleted).toBe(false);
    expect(storage.headObject).toHaveBeenCalledTimes(8);
    expect(storage.deleteObjects).toHaveBeenCalledExactlyOnceWith(
      keys,
      expect.any(AbortSignal),
    );
  },
);

it("passes an empty historical key to storage and retains rows when storage rejects it", async () => {
  const repo = mediaRepositoryFixture(mediaRow({ key: "" }));
  let rowsDeleted = false;
  repo.deleteWithStorage.mockImplementation(async (_ids, _actor, remove) => {
    await remove([mediaRow({ key: "" })]);
    rowsDeleted = true;
  });
  const storage = mediaStorageFixture();
  storage.deleteObjects.mockRejectedValue(new Error("Invalid empty key"));
  await expect(
    destroyMedia(repo, storage, ["id"], cache, "actor", true),
  ).rejects.toThrow("部分删除");
  expect(storage.deleteObjects).toHaveBeenCalledExactlyOnceWith(
    [""],
    expect.any(AbortSignal),
  );
  expect(storage.headObject).not.toHaveBeenCalled();
  expect(rowsDeleted).toBe(false);
});

afterEach(() => vi.useRealTimers());

it("uses one deadline for object deletion and all verification batches", async () => {
  vi.useFakeTimers();
  const storage = mediaStorageFixture();
  const signals: AbortSignal[] = [];
  storage.deleteObjects.mockImplementation(async (_keys, signal) => {
    if (signal) signals.push(signal);
    await new Promise((resolve) => setTimeout(resolve, 25_000));
  });
  storage.headObject.mockImplementation((_key, signal) => {
    if (signal) signals.push(signal);
    return new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
    });
  });
  const repo = mediaRepositoryFixture();
  const invalidate = vi.fn(async () => ({ state: "completed" as const }));
  const deletion = destroyMedia(
    repo,
    storage,
    ["id"],
    { invalidate },
    "actor",
    true,
  );
  const expectedFailure = expect(deletion).rejects.toThrow("部分删除");
  await vi.advanceTimersByTimeAsync(29_999);
  expect(signals).toHaveLength(2);
  expect(signals[0]).toBe(signals[1]);
  expect(signals[0]?.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await expectedFailure;
  expect(signals[0]?.aborted).toBe(true);
  expect(invalidate).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
