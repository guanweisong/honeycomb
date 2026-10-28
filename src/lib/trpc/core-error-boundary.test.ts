// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { createMockContext } from "@tests/helpers/test-utils";
import { createMemoryObservability } from "@tests/helpers/memory-observability";
import { ApplicationError } from "@/lib/errors/application-error";
import { DomainError } from "@/lib/errors/domain-error";
import { LogEvent } from "@/lib/observability/core/names";
import { configureObservability } from "@/lib/observability/server/registry";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc/core";

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
  missing: publicProcedure.query(() => {
    throw new ApplicationError("NOT_FOUND", "Item missing");
  }),
  conflict: publicProcedure.query(() => {
    throw new ApplicationError("CONFLICT", "Item conflict");
  }),
  domain: publicProcedure.query(async () => {
    await Promise.resolve();
    throw new DomainError("文章不存在", "POST_NOT_FOUND");
  }),
  protected: publicProcedure.query(() => {
    throw new DomainError("禁止修改保护用户", "PROTECTED_USER");
  }),
  invalid: publicProcedure.query(() => {
    throw new DomainError("状态转换无效", "INVALID_STATE_TRANSITION");
  }),
  middleware: publicProcedure
    .use(() => {
      throw new DomainError("中间件拒绝操作", "INVALID_STATE_TRANSITION");
    })
    .query(() => "unreachable"),
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

  describe.each([true, false])(
    "application mapping with observability %s",
    (observability) => {
      it.each([
        ["application", 403, "FORBIDDEN"],
        ["missing", 404, "NOT_FOUND"],
        ["conflict", 409, "CONFLICT"],
        ["domain", 404, "NOT_FOUND"],
        ["protected", 403, "FORBIDDEN"],
        ["invalid", 400, "BAD_REQUEST"],
        ["middleware", 400, "BAD_REQUEST"],
      ] as const)(
        "preserves %s over HTTP and server callers",
        async (path, status, code) => {
          const memory = createMemoryObservability();
          configureObservability(memory);
          const response = await request(path, { observability });
          expect(response.status).toBe(status);
          if (observability) {
            expect(
              memory.logEvents.filter(
                ({ event }) => event === LogEvent.requestFailed,
              ),
            ).toEqual([
              expect.objectContaining({
                level: "warn",
                context: expect.objectContaining({ outcome: code }),
              }),
            ]);
          }
          expect(await response.json()).toMatchObject({
            error: { data: { code, httpStatus: status } },
          });
          await expect(
            router
              .createCaller({
                ...createMockContext(),
                requestObservabilityEnabled: observability,
              })
              [path](),
          ).rejects.toMatchObject({ code });
          if (!observability) {
            expect(memory.logEvents).toEqual([]);
            expect(memory.metricEvents).toEqual([]);
          }
        },
      );
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
