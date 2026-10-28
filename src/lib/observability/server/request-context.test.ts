// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  createRequestContext,
  getRequestIdFromHeaders,
} from "@/lib/observability/server/request-context";
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

  it("does not expose Node request storage from the cross-runtime entrypoint", () => {
    expect(publicObservability).not.toHaveProperty("getRequestContext");
    expect(publicObservability).not.toHaveProperty("runWithRequestContext");
  });
});
