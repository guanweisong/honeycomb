import { describe, expect, it } from "vitest";

import {
  createRequestContext,
  getRequestContext,
  runWithRequestContext,
} from "./request-context";

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
});
