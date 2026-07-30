import { describe, expect, it } from "vitest";

import { getPageEditorQueryInput } from "./pageEditorQuery";

describe("page editor query", () => {
  it("keeps the admin detail input shape for create and edit routes", () => {
    expect(getPageEditorQueryInput(null)).toEqual({ id: null });
    expect(getPageEditorQueryInput("page-42")).toEqual({ id: "page-42" });
  });
});
