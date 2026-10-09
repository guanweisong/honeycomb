import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminRouteFallback from "./index";

describe("AdminRouteFallback", () => {
  it("renders a generic accessible loading state", () => {
    const markup = renderToStaticMarkup(<AdminRouteFallback />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("正在加载");
    expect(markup).not.toContain("admin");
  });
});
