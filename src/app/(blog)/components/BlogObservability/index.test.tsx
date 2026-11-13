import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BlogObservability from "@/app/(blog)/components/BlogObservability";

describe("blog observability", () => {
  it("does not read route parameters during prerendering", () => {
    expect(renderToStaticMarkup(<BlogObservability />)).toBe("");
  });
});
