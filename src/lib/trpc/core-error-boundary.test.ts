// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { createMockContext } from "@tests/helpers/test-utils";
import { createMemoryObservability } from "@tests/helpers/memory-observability";
import { ApplicationError } from "@/lib/errors/application-error";
import { DomainError } from "@/lib/errors/domain-error";
import { configureObservability } from "@/lib/observability/server/registry";
import { createTRPCRouter, mapApplicationError, publicProcedure } from "./core";

const syntheticSecret = "synthetic-database-value";
const databaseError = () =>
  new DrizzleQueryError(
    "update account set password = ?",
    [syntheticSecret],
    new Error("synthetic provider failure"),
  );

const router = createTRPCRouter({
  unknown: publicProcedure.query(() => {
    throw databaseError();
  }),
  application: publicProcedure.query(() => {
    throw new ApplicationError("FORBIDDEN", "业务操作不允许");
  }),
  domain: publicProcedure.query(() =>
    mapApplicationError(new DomainError("文章不存在", "POST_NOT_FOUND")),
  ),
  explicit: publicProcedure.query(() => {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "验证码服务出现问题。",
      cause: new Error(syntheticSecret),
    });
  }),
  ok: publicProcedure.query(() => "ok"),
});

function request(
  path: string,
  options: {
    observability?: boolean;
    contextFailure?: boolean;
    batch?: boolean;
  } = {},
) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(
      `https://example.test/api/trpc/${path}${options.batch ? "?batch=1" : ""}`,
    ),
    router,
    createContext: () => {
      if (options.contextFailure) throw databaseError();
      return {
        ...createMockContext(),
        requestObservabilityEnabled: options.observability,
      };
    },
  });
}

describe("tRPC HTTP error boundary", () => {
  beforeEach(() => configureObservability(createMemoryObservability()));
  afterEach(() => configureObservability());

  it.each([true, false])(
    "masks unknown failures with observability %s",
    async (observability) => {
      const response = await request("unknown", { observability });
      const text = await response.text();
      const body: unknown = JSON.parse(text);
      expect(response.status).toBe(500);
      expect(body).toEqual({
        error: {
          message: "Internal server error",
          code: -32603,
          data: {
            code: "INTERNAL_SERVER_ERROR",
            httpStatus: 500,
            path: "unknown",
          },
        },
      });
      expect(text).not.toContain(syntheticSecret);
      expect(text).not.toContain("update account");
      expect(text).not.toContain("stack");
    },
  );

  it("masks failures before procedure middleware when context creation fails", async () => {
    const response = await request("ok", { contextFailure: true });
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).toContain('"message":"Internal server error"');
    expect(text).not.toContain(syntheticSecret);
    expect(text).not.toContain("stack");
  });

  it("masks only the failed item in a mixed batch", async () => {
    const response = await request("unknown,ok", { batch: true });
    const text = await response.text();
    const body: unknown = JSON.parse(text);
    expect(response.status).toBe(207);
    expect(body).toEqual([
      {
        error: {
          message: "Internal server error",
          code: -32603,
          data: {
            code: "INTERNAL_SERVER_ERROR",
            httpStatus: 500,
            path: "unknown",
          },
        },
      },
      { result: { data: "ok" } },
    ]);
    expect(text).not.toContain(syntheticSecret);
  });

  it.each([
    ["application", 403, "FORBIDDEN", "业务操作不允许"],
    ["domain", 404, "NOT_FOUND", "文章不存在"],
    ["explicit", 500, "INTERNAL_SERVER_ERROR", "验证码服务出现问题。"],
  ] as const)(
    "preserves the explicit %s error contract",
    async (path, status, code, message) => {
      const response = await request(path);
      const text = await response.text();
      const body: unknown = JSON.parse(text);
      expect(response.status).toBe(status);
      expect(body).toMatchObject({
        error: { message, data: { code, httpStatus: status, path } },
      });
      expect(text).not.toContain(syntheticSecret);
    },
  );
});
