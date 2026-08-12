import { afterEach, describe, expect, it } from "vitest";
import { createMemoryObservability } from "../adapters/memory";
import { MetricName } from "../core/names";
import { configureObservability } from "./registry";
import { observeDbOperation } from "./database-operation";

describe("observeDbOperation", () => {
  afterEach(() => configureObservability());

  it("records count and duration with stable labels on success", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);

    await expect(
      observeDbOperation("category.list", "select", async () => [
        { id: "secret-id" },
      ]),
    ).resolves.toEqual([{ id: "secret-id" }]);

    expect(memory.metricEvents).toEqual([
      {
        type: "increment",
        name: MetricName.databaseOperationsTotal,
        labels: {
          queryName: "category.list",
          operation: "select",
          outcome: "success",
        },
      },
      {
        type: "duration",
        name: MetricName.databaseOperationDurationMs,
        value: expect.any(Number),
        labels: {
          queryName: "category.list",
          operation: "select",
          outcome: "success",
        },
      },
    ]);
  });

  it("records a safe error metric and preserves the original rejection", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const failure = new Error("SQL failed for user-123 with token=secret");

    await expect(
      observeDbOperation("comment.create", "insert", async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(memory.metricEvents).toEqual([
      {
        type: "increment",
        name: MetricName.databaseOperationsTotal,
        labels: {
          queryName: "comment.create",
          operation: "insert",
          outcome: "error",
        },
      },
      {
        type: "increment",
        name: MetricName.databaseErrorsTotal,
        labels: {
          queryName: "comment.create",
          operation: "insert",
          outcome: "error",
        },
      },
      {
        type: "duration",
        name: MetricName.databaseOperationDurationMs,
        value: expect.any(Number),
        labels: {
          queryName: "comment.create",
          operation: "insert",
          outcome: "error",
        },
      },
    ]);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("user-123");
    expect(JSON.stringify(memory.metricEvents)).not.toContain("secret");
  });

  it("drops unsafe query names without affecting database operations", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);

    for (const unsafeName of [
      "user-123",
      "request.01JTESTREQUEST123",
      "SELECT * FROM user WHERE id = ?",
      "user.lookup.01JRESOURCE123",
      "user.lookup.alphabeticresource",
    ]) {
      await expect(
        observeDbOperation(unsafeName as never, "select", async () => "ok"),
      ).resolves.toBe("ok");
    }

    expect(memory.metricEvents).toEqual([]);
  });
});
