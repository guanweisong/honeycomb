// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  createRequestContext,
  getRequestIdFromHeaders,
} from "@/lib/observability/server/request-context";
import {
  getRequestContext,
  runWithRequestContext,
} from "@/lib/observability/server/node-request-context";
import * as publicObservability from "@/lib/observability/server/index";

describe("request context", () => {
  it("preserves an incoming request ID", () => {
    const context = createRequestContext({ requestId: "req-client-provided" });

    expect(context).toEqual({ requestId: "req-client-provided" });
  });

  it("uses the request ID header when present", () => {
    const context = createRequestContext({
      headers: new Headers({ "x-request-id": "req-header-provided" }),
    });

    expect(context).toEqual({ requestId: "req-header-provided" });
  });

  it("reads an explicit request ID from a header record with mixed casing", () => {
    const requestId = getRequestIdFromHeaders({
      "X-ReQuEsT-Id": "req-header-mixed-case",
    });

    expect(requestId).toBe("req-header-mixed-case");
  });

  it("generates a request ID when no identifier is provided", () => {
    const context = createRequestContext();

    expect(context.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("keeps a Node request context across asynchronous work", async () => {
    const context = { requestId: "req-async-scope" };

    await runWithRequestContext(context, async () => {
      await Promise.resolve();

      expect(getRequestContext()).toEqual(context);
    });

    expect(getRequestContext()).toBeUndefined();
  });

  it("isolates interleaved asynchronous requests without leaking either context", async () => {
    const resumeFirst = Promise.withResolvers<void>();
    const resumeSecond = Promise.withResolvers<void>();
    const firstContext = { requestId: "req-first" };
    const secondContext = { requestId: "req-second" };

    const first = runWithRequestContext(firstContext, async () => {
      expect(getRequestContext()).toEqual(firstContext);
      await resumeFirst.promise;
      expect(getRequestContext()).toEqual(firstContext);
      return getRequestContext();
    });
    const second = runWithRequestContext(secondContext, async () => {
      expect(getRequestContext()).toEqual(secondContext);
      await resumeSecond.promise;
      expect(getRequestContext()).toEqual(secondContext);
      return getRequestContext();
    });

    try {
      // Both scopes are suspended. Resume the older one while the newer
      // request remains active, then resume the newer one after the first exits.
      expect(getRequestContext()).toBeUndefined();
      resumeFirst.resolve();
      await expect(first).resolves.toEqual(firstContext);
      expect(getRequestContext()).toBeUndefined();
      resumeSecond.resolve();
      await expect(second).resolves.toEqual(secondContext);
      expect(getRequestContext()).toBeUndefined();
    } finally {
      resumeFirst.resolve();
      resumeSecond.resolve();
      await Promise.allSettled([first, second]);
    }
  });

  it("does not expose Node request storage from the cross-runtime entrypoint", () => {
    expect(publicObservability).not.toHaveProperty("getRequestContext");
    expect(publicObservability).not.toHaveProperty("runWithRequestContext");
  });
});
