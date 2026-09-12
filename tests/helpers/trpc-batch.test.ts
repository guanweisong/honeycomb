import { describe, expect, it } from "vitest";
import { decodeTrpcBatchRequest } from "./trpc-batch";

describe("decodeTrpcBatchRequest", () => {
  it("decodes procedure names and transformer json inputs from GET requests", () => {
    const input = encodeURIComponent(
      JSON.stringify({ 0: { json: { id: "page-1" } }, 1: { json: null } }),
    );

    expect(
      decodeTrpcBatchRequest({
        url: `https://example.test/api/trpc/page.detail,setting.index?input=${input}`,
        method: "GET",
        body: null,
      }),
    ).toEqual([
      { procedure: "page.detail", input: { id: "page-1" } },
      { procedure: "setting.index", input: null },
    ]);
  });

  it("decodes POST request bodies and preserves unwrapped inputs", () => {
    expect(
      decodeTrpcBatchRequest({
        url: "https://example.test/api/trpc/comment.destroy",
        method: "POST",
        body: JSON.stringify({ 0: { ids: ["comment-1"] } }),
      }),
    ).toEqual([
      { procedure: "comment.destroy", input: { ids: ["comment-1"] } },
    ]);
  });
});
