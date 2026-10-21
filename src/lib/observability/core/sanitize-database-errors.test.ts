// @vitest-environment node

import { describe, expect, it } from "vitest";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { serializeError } from "./sanitize";
import { createSafeLogger } from "./safe-adapters";
import { LogEvent } from "./names";

const privateBinding = "synthetic-private-draft\nwith another line";
const databaseError = () =>
  new DrizzleQueryError(
    "update account set password = ?",
    ["synthetic-salt:synthetic-hash", privateBinding],
    new Error(`provider included ${privateBinding}`),
  );

describe("copied database error redaction", () => {
  it.each(["message", "stack", "plain", "plain-cause"])(
    "redacts a %s copy before it reaches a logger",
    (kind) => {
      const original = databaseError();
      const error =
        kind === "message"
          ? new Error(original.message)
          : kind === "stack"
            ? Object.assign(new Error("Operation failed"), {
                stack: original.stack,
              })
            : kind === "plain-cause"
              ? { message: privateBinding, cause: original }
              : {
                  name: "Error",
                  message: original.message,
                  stack: original.stack,
                  cause: { message: privateBinding },
                };
      const captured: unknown[] = [];
      createSafeLogger({
        info: () => undefined,
        warn: () => undefined,
        error: (_event, context) => captured.push(context),
      }).error(LogEvent.requestFailed, {
        requestId: "req-safe",
        nested: { error },
      });

      expect(captured).toEqual([
        {
          requestId: "req-safe",
          nested: {
            error: {
              name: "DatabaseError",
              message: "Database operation failed",
            },
          },
        },
      ]);
      expect(JSON.stringify(captured)).not.toContain("synthetic-private");
      expect(JSON.stringify(captured)).not.toContain("update account");
    },
  );

  it("preserves current database output after repeated serialization", () => {
    const sanitized = serializeError(databaseError());
    expect(serializeError(sanitized)).toEqual(sanitized);
  });
});
