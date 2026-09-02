import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PageState } from "./index";

describe("PageState", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("renders the shared status content and custom actions", async () => {
    await act(async () =>
      root.render(
        <PageState
          title="无权访问"
          description="当前账号没有访问此页面的权限。"
          icon={<span data-testid="state-icon">!</span>}
          actions={<button type="button">返回</button>}
        />,
      ),
    );

    expect(container.querySelector("main")?.getAttribute("role")).toBe(
      "alert",
    );
    expect(container.querySelector("h1")?.textContent).toBe("无权访问");
    expect(container.querySelector("p")?.textContent).toBe(
      "当前账号没有访问此页面的权限。",
    );
    expect(container.querySelector("[data-testid='state-icon']")).toBeTruthy();
    expect(container.querySelector("button")?.textContent).toBe("返回");
  });

  it("supports a compact layout for an admin error boundary", async () => {
    await act(async () =>
      root.render(
        <PageState
          compact
          description="后台暂时无法加载。"
          actions={<button type="button">重试</button>}
        />,
      ),
    );

    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("main")?.className).not.toContain(
      "min-h-screen",
    );
    expect(container.textContent).toContain("后台暂时无法加载。");
  });
});
