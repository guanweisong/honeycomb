import { describe, expect, it } from "vitest";

import {
  createRequestContext,
  getRequestIdFromHeaders,
} from "./request-context";
import {
  getRequestContext,
  runWithRequestContext,
} from "./node-request-context";
import * as publicObservability from "./index";

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

  it("does not expose Node request storage from the cross-runtime entrypoint", () => {
    expect(publicObservability).not.toHaveProperty("getRequestContext");
    expect(publicObservability).not.toHaveProperty("runWithRequestContext");
  });
});
