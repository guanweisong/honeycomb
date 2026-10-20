import { afterEach, describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { transactionWithBeginRetry } from "./transaction-begin-retry";

const busy = () => Object.assign(new Error("busy"), { code: "SQLITE_BUSY" });
const message = "caller-owned conflict";
afterEach(() => vi.useRealTimers());

describe("transactionWithBeginRetry", () => {
  it("recovers on the fourth BEGIN after exactly 10/20/40ms, running work once", async () => {
    vi.useFakeTimers();
    const db = createMockDb();
    db.transaction
      .mockRejectedValueOnce(busy())
      .mockRejectedValueOnce(busy())
      .mockRejectedValueOnce(busy());
    const operation = vi.fn(async () => ({ version: 2 }));
    const pending = transactionWithBeginRetry(
      asMockDatabase(db),
      message,
      operation,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(operation).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(9);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(db.transaction).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(19);
    expect(db.transaction).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(db.transaction).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(39);
    expect(operation).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ version: 2 });
    expect(db.transaction).toHaveBeenCalledTimes(4);
    expect(operation).toHaveBeenCalledOnce();
  });

  it("reports the caller's conflict after four failed BEGIN attempts", async () => {
    vi.useFakeTimers();
    const db = createMockDb();
    db.transaction.mockRejectedValue(busy());
    const operation = vi.fn(async () => 1);
    const rejected = expect(
      transactionWithBeginRetry(asMockDatabase(db), message, operation),
    ).rejects.toMatchObject({ code: "CONFLICT", message });
    await vi.runAllTimersAsync();
    await rejected;
    expect(db.transaction).toHaveBeenCalledTimes(4);
    expect(operation).not.toHaveBeenCalled();
  });

  it.each([
    null,
    undefined,
    "SQLITE_BUSY",
    { code: "CONNECTION_CLOSED" },
    { cause: { code: "SQLITE_BUSY" } },
  ])("does not retry unrecognized BEGIN failure %j", async (failure) => {
    const db = createMockDb();
    db.transaction.mockRejectedValue(failure);
    const operation = vi.fn(async () => 1);
    await expect(
      transactionWithBeginRetry(asMockDatabase(db), message, operation),
    ).rejects.toBe(failure);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(operation).not.toHaveBeenCalled();
  });

  it("does not replay a callback busy failure", async () => {
    const db = createMockDb();
    const failure = busy();
    const operation = vi.fn(async () => {
      throw failure;
    });
    await expect(
      transactionWithBeginRetry(asMockDatabase(db), message, operation),
    ).rejects.toBe(failure);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledOnce();
  });

  it("does not replay a busy failure after the callback completed", async () => {
    const db = createMockDb();
    const failure = busy();
    db.transaction.mockImplementation(
      async (callback: (tx: typeof db) => Promise<unknown>) => {
        await callback(db);
        throw failure;
      },
    );
    const operation = vi.fn(async () => 1);
    await expect(
      transactionWithBeginRetry(asMockDatabase(db), message, operation),
    ).rejects.toBe(failure);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledOnce();
  });
});
