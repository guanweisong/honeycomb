import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMemoryObservability } from "@/packages/observability/adapters/memory";
import { LogEvent, MetricName } from "@/packages/observability/core/names";
import { configureObservability } from "@/packages/observability/server/registry";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { Permission } from "@/packages/auth/permissions";

import {
  createTRPCRouter,
  permissionProcedure,
  permissionsProcedure,
  protectedProcedure,
  publicProcedure,
} from "./core";
import type { Context } from "./context";

const requestId = "req-trpc-observability";

function createContext(user: Context["user"] = null): Context {
  return {
    db: {} as Context["db"],
    user,
    hasRequest: true,
    header: new Headers(),
    requestId,
  };
}

function expectApiMetrics(
  events: ReturnType<typeof createMemoryObservability>["metricEvents"],
  outcome: string,
): void {
  const labels = { procedure: "observed", method: "query", outcome };

  expect(events).toContainEqual({
    type: "increment",
    name: MetricName.apiRequestsTotal,
    labels,
  });
  expect(events).toContainEqual({
    type: "duration",
    name: MetricName.apiRequestDurationMs,
    value: expect.any(Number),
    labels,
  });
}

describe("tRPC observability middleware", () => {
  afterEach(() => {
    configureObservability();
  });

  it("records the request lifecycle and API metrics for a public procedure success", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const router = createTRPCRouter({
      observed: publicProcedure.query(() => "ok"),
    });

    await expect(router.createCaller(createContext()).observed()).resolves.toBe("ok");

    expect(memory.logEvents).toEqual([
      {
        level: "info",
        event: LogEvent.requestStarted,
        context: { requestId, procedure: "observed", method: "query" },
      },
      {
        level: "info",
        event: LogEvent.requestCompleted,
        context: {
          requestId,
          procedure: "observed",
          method: "query",
          durationMs: expect.any(Number),
          outcome: "success",
        },
      },
    ]);
    expectApiMetrics(memory.metricEvents, "success");
    expect(memory.metricEvents).not.toContainEqual(expect.objectContaining({
      name: MetricName.apiErrorsTotal,
    }));
  });

  it("records a BAD_REQUEST validation failure without request input", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const router = createTRPCRouter({
      observed: publicProcedure.input(z.object({ title: z.string() })).query(() => "ok"),
    });

    await expect(router.createCaller(createContext()).observed({} as never)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });

    expect(memory.logEvents).toEqual([
      {
        level: "info",
        event: LogEvent.requestStarted,
        context: { requestId, procedure: "observed", method: "query" },
      },
      {
        level: "warn",
        event: LogEvent.requestFailed,
        context: {
          requestId,
          procedure: "observed",
          method: "query",
          durationMs: expect.any(Number),
          outcome: "BAD_REQUEST",
        },
      },
    ]);
    expectApiMetrics(memory.metricEvents, "BAD_REQUEST");
    expect(memory.metricEvents).toContainEqual({
      type: "increment",
      name: MetricName.apiErrorsTotal,
      labels: { procedure: "observed", method: "query", outcome: "BAD_REQUEST" },
    });
  });

  it("records a FORBIDDEN protected-procedure failure", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const router = createTRPCRouter({
      observed: protectedProcedure([UserLevel.ADMIN]).query(() => "ok"),
    });

    await expect(router.createCaller(createContext({
      id: "user-1",
      level: UserLevel.GUEST,
    })).observed()).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(memory.logEvents).toEqual([
      {
        level: "info",
        event: LogEvent.requestStarted,
        context: { requestId, procedure: "observed", method: "query" },
      },
      {
        level: "warn",
        event: LogEvent.requestFailed,
        context: {
          requestId,
          procedure: "observed",
          method: "query",
          durationMs: expect.any(Number),
          outcome: "FORBIDDEN",
        },
      },
    ]);
    expectApiMetrics(memory.metricEvents, "FORBIDDEN");
    expect(memory.metricEvents).toContainEqual({
      type: "increment",
      name: MetricName.apiErrorsTotal,
      labels: { procedure: "observed", method: "query", outcome: "FORBIDDEN" },
    });
  });

  it("serializes an unknown exception while preserving the tRPC error contract", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const router = createTRPCRouter({
      observed: publicProcedure.query(() => {
        throw new Error("unexpected failure");
      }),
    });

    await expect(router.createCaller(createContext()).observed()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });

    expect(memory.logEvents).toEqual([
      {
        level: "info",
        event: LogEvent.requestStarted,
        context: { requestId, procedure: "observed", method: "query" },
      },
      {
        level: "error",
        event: LogEvent.requestFailed,
        context: {
          requestId,
          procedure: "observed",
          method: "query",
          durationMs: expect.any(Number),
          outcome: "INTERNAL_SERVER_ERROR",
          error: {
            name: "Error",
            message: "unexpected failure",
            stack: expect.any(String),
          },
        },
      },
    ]);
    expectApiMetrics(memory.metricEvents, "INTERNAL_SERVER_ERROR");
    expect(memory.metricEvents).toContainEqual({
      type: "increment",
      name: MetricName.apiErrorsTotal,
      labels: {
        procedure: "observed",
        method: "query",
        outcome: "INTERNAL_SERVER_ERROR",
      },
    });
  });
});

describe("capability procedures", () => {
  afterEach(() => {
    configureObservability();
  });

  it("allows a granted single permission", async () => {
    const router = createTRPCRouter({
      observed: permissionProcedure(Permission.postUpdate).query(() => "ok"),
    });

    await expect(
      router.createCaller(createContext({
        id: "editor-1",
        level: UserLevel.EDITOR,
      })).observed(),
    ).resolves.toBe("ok");
  });

  it("denies a missing permission before the handler and records a private-safe outcome", async () => {
    const memory = createMemoryObservability();
    configureObservability(memory);
    const handler = vi.fn(() => "ok");
    const router = createTRPCRouter({
      observed: permissionProcedure(Permission.userManage).query(handler),
    });

    await expect(
      router.createCaller(createContext({
        id: "editor-private-id",
        level: UserLevel.EDITOR,
      })).observed(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(handler).not.toHaveBeenCalled();
    expect(memory.logEvents).toContainEqual({
      level: "warn",
      event: LogEvent.authorizationDenied,
      context: {
        requestId,
        procedure: "observed",
        requiredPermissions: [Permission.userManage],
        mode: "all",
        outcome: "FORBIDDEN",
      },
    });
    expect(memory.metricEvents).toContainEqual({
      type: "increment",
      name: MetricName.apiErrorsTotal,
      labels: { procedure: "observed", method: "query", outcome: "FORBIDDEN" },
    });
    expect(JSON.stringify(memory.logEvents)).not.toContain("editor-private-id");
    expect(JSON.stringify(memory.logEvents)).not.toContain(UserLevel.EDITOR);
  });

  it("uses all mode by default for multiple permissions", async () => {
    const router = createTRPCRouter({
      observed: permissionsProcedure([
        Permission.postUpdate,
        Permission.userManage,
      ]).query(() => "ok"),
    });

    await expect(
      router.createCaller(createContext({
        id: "editor-1",
        level: UserLevel.EDITOR,
      })).observed(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("supports explicit all and any modes", async () => {
    const router = createTRPCRouter({
      all: permissionsProcedure(
        [Permission.postUpdate, Permission.userManage],
        { mode: "all" },
      ).query(() => "all"),
      any: permissionsProcedure(
        [Permission.postUpdate, Permission.userManage],
        { mode: "any" },
      ).query(() => "any"),
    });
    const caller = router.createCaller(createContext({
      id: "editor-1",
      level: UserLevel.EDITOR,
    }));

    await expect(caller.all()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.any()).resolves.toBe("any");
  });

  it("denies unauthenticated, unknown-role, unknown-permission, and empty checks", async () => {
    const router = createTRPCRouter({
      authenticated: permissionProcedure(Permission.postUpdate).query(() => "ok"),
      unknownPermission: permissionProcedure("future:permission" as never).query(
        () => "ok",
      ),
      empty: permissionsProcedure([]).query(() => "ok"),
    });

    await expect(
      router.createCaller(createContext()).authenticated(),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      router.createCaller(createContext({
        id: "unknown-role",
        level: "OWNER" as UserLevel,
      })).authenticated(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      router.createCaller(createContext({
        id: "admin-1",
        level: UserLevel.ADMIN,
      })).unknownPermission(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      router.createCaller(createContext({
        id: "admin-1",
        level: UserLevel.ADMIN,
      })).empty(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
