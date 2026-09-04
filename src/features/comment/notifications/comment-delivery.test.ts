import { afterEach, describe, expect, it } from "vitest";

import { createMemoryObservability } from "@/packages/infrastructure/observability/adapters/memory";
import { configureObservability } from "@/packages/infrastructure/observability/server";
import { logCommentNotificationFailure } from "./comment-delivery";

describe("comment notification delivery logs", () => {
  afterEach(() => configureObservability());

  it("records a structured failure without sensitive error details", () => {
    const memory = createMemoryObservability();
    configureObservability(memory);

    logCommentNotificationFailure(
      new Error("visitor@example.test 203.0.113.10 private comment"),
    );

    expect(memory.logEvents).toHaveLength(1);
    expect(memory.logEvents[0]?.context).toEqual({
      service: "email",
      operation: "prepare-comment-notification",
      outcome: "error",
      errorType: "Error",
    });
    expect(JSON.stringify(memory.logEvents)).not.toContain("visitor@example.test");
    expect(JSON.stringify(memory.logEvents)).not.toContain("203.0.113.10");
    expect(JSON.stringify(memory.logEvents)).not.toContain("private comment");
  });
});
