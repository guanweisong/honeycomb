import { describe, expect, it } from "vitest";

describe("default test environment", () => {
  it("retains DOM support for unannotated TypeScript tests", () => {
    const button = document.createElement("button");
    button.textContent = "DOM remains available";

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.textContent).toBe("DOM remains available");
    expect(window.document).toBe(document);
  });
});
