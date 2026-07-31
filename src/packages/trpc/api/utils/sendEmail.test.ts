import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryObservability } from "@/packages/observability/adapters/memory";
import { MetricName } from "@/packages/observability/core/names";
import { configureObservability } from "@/packages/observability/server";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock("@/packages/trpc/api/modules/comment/components/EmailMessage/AdminCommentEmailMessage", () => ({
  default: () => null,
}));
vi.mock("@/packages/trpc/api/modules/comment/components/EmailMessage/ReplyCommentEmailMessage", () => ({
  default: () => null,
}));

import { sendEmail } from "./sendEmail";

const payload = {
  setting: { siteName: { zh: "站点", en: "Site" } },
  currentComment: { id: "comment-1" },
} as never;

describe("sendEmail observability", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "sender@example.com";
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  afterEach(() => configureObservability());

  it("records email success without recipient labels", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    sendMock.mockResolvedValue({ data: { id: "message-1" } });

    await sendEmail("ADMIN_NOTICE", payload);

    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
    expect(memory.metricEvents.every((event) =>
      event.labels.service === "email" &&
      event.labels.operation === "send" &&
      event.labels.outcome === "success"
    )).toBe(true);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("example.com");
  });

  it("records email failures and rethrows the provider error", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const failure = new Error("recipient admin@example.com rejected");
    sendMock.mockRejectedValue(failure);

    await expect(sendEmail("ADMIN_NOTICE", payload)).rejects.toBe(failure);
    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceErrorsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("example.com");
  });

  it("records a resolved provider error as a safe email failure", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "recipient admin@example.com rejected" },
    });

    await expect(sendEmail("ADMIN_NOTICE", payload)).rejects.toThrow(
      "Email delivery failed",
    );

    expect(memory.metricEvents.map(({ name }) => name)).toEqual([
      MetricName.externalServiceOperationsTotal,
      MetricName.externalServiceErrorsTotal,
      MetricName.externalServiceOperationDurationMs,
    ]);
    expect(JSON.stringify(memory.metricEvents)).not.toContain("example.com");
    expect(JSON.stringify(memory.logEvents)).not.toContain("example.com");
    expect(JSON.stringify(memory.logEvents)).not.toContain("rejected");
  });
});
