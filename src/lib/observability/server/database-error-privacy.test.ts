// @vitest-environment node

import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryObservability } from "@tests/helpers/memory-observability";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc/core";
import { createConsoleLogger } from "@/lib/observability/adapters/console";
import { createSentryLogger } from "@/lib/observability/adapters/sentry";
import { LogEvent } from "@/lib/observability/core/names";
import { observeDbOperation } from "@/lib/observability/server/database-operation";
import { configureObservability } from "@/lib/observability/server/registry";

describe("database error privacy at log sinks", () => {
  afterEach(() => configureObservability());

  it.each([false, true])(
    "omits SQL and arbitrary bindings from console and Sentry (wrapped=%s)",
    async (wrapped) => {
      const query = "insert into private_test_content (body) values (?)";
      const binding = "dummy unpublished sentence without credential keywords";
      const driverCause = new Error(`driver echoed ${binding}`);
      const databaseError = new DrizzleQueryError(
        query,
        [binding],
        driverCause,
      );
      const failure = wrapped
        ? new Error(databaseError.message, { cause: databaseError })
        : databaseError;
      const lines: string[] = [];
      const remote = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      configureObservability({
        logger: createSentryLogger(
          remote,
          createConsoleLogger({ write: (line) => lines.push(line) }),
        ),
        metrics: createMemoryObservability().metrics,
      });
      const router = createTRPCRouter({
        observed: publicProcedure.mutation(() =>
          observeDbOperation("comment.create", "insert", async () => {
            throw failure;
          }),
        ),
      });
      const caller = router.createCaller({
        get db(): never {
          throw new Error("This regression must not access a database");
        },
        user: null,
        hasRequest: true,
        header: new Headers(),
        requestId: "privacy-regression",
      });

      // Check only the public classification, never print the original error.
      const code = await caller.observed().then(
        () => "unexpected-success",
        (error: unknown) =>
          typeof error === "object" && error !== null && "code" in error
            ? error.code
            : "missing-code",
      );
      expect(code).toBe("INTERNAL_SERVER_ERROR");
      expect(remote.error).toHaveBeenCalledTimes(1);
      expect(remote.error.mock.calls[0]?.[0]).toBe(LogEvent.requestFailed);
      for (const output of [
        lines.join("\n"),
        JSON.stringify(remote.error.mock.calls),
      ]) {
        expect(output.includes(query)).toBe(false);
        expect(output.includes(binding)).toBe(false);
        expect(output.includes("params:")).toBe(false);
        expect(output).toContain("DatabaseError");
        expect(output).toContain("Database operation failed");
      }
    },
  );
});
