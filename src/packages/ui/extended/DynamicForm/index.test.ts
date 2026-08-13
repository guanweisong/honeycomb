import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DynamicForm } from "./index";

if (typeof ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver;
}

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("DynamicForm", () => {
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

  it("submits the validated values from a text field", async () => {
    const onSubmit = vi.fn();
    const schema = z.object({ title: z.string().min(1) });

    await act(async () => {
      root.render(
        React.createElement(DynamicForm, {
          schema,
          fields: [{ name: "title", label: "标题", type: "text" }],
          defaultValues: { title: "初始标题" },
          onSubmit,
        }),
      );
    });

    const input = container.querySelector<HTMLInputElement>("input");
    expect(input?.value).toBe("初始标题");

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setValue?.call(input, "更新后的标题");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
      container
        .querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.click();
    });

    expect(onSubmit).toHaveBeenCalledWith({ title: "更新后的标题" });
  });

  it("shows validation feedback and does not submit invalid values", async () => {
    const onSubmit = vi.fn();
    const schema = z.object({ title: z.string().min(1, "标题不能为空") });

    await act(async () => {
      root.render(
        React.createElement(DynamicForm, {
          schema,
          fields: [{ name: "title", label: "标题", type: "text" }],
          defaultValues: { title: "" },
          onSubmit,
        }),
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.click();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.textContent).toContain("标题不能为空");
  });

  it("renders textarea fields and applies dynamic disabled state", async () => {
    const schema = z.object({
      enabled: z.boolean(),
      description: z.string(),
    });

    await act(async () => {
      root.render(
        React.createElement(DynamicForm, {
          schema,
          fields: [
            { name: "enabled", label: "启用", type: "switch" },
            {
              name: "description",
              label: "描述",
              type: "textarea",
              disabled: (values) => values.enabled === false,
            },
          ],
          defaultValues: { enabled: false, description: "说明" },
          onSubmit: vi.fn(),
          renderSubmitButton: false,
        }),
      );
    });

    expect(container.querySelector("textarea")?.value).toBe("说明");
    expect(container.querySelector("textarea")?.disabled).toBe(true);
  });

  it("renders select, radio, and multilingual fields", async () => {
    const schema = z.object({
      status: z.string(),
      mode: z.string(),
      title: z.object({ zh: z.string(), en: z.string() }),
    });

    await act(async () => {
      root.render(
        React.createElement(DynamicForm, {
          schema,
          fields: [
            {
              name: "status",
              label: "状态",
              type: "select",
              options: [{ label: "启用", value: "enabled" }],
            },
            {
              name: "mode",
              label: "模式",
              type: "radio",
              options: [{ label: "自动", value: "auto" }],
            },
            { name: "title", label: "标题", type: "text", multiLang: true },
          ],
          defaultValues: {
            status: "enabled",
            mode: "auto",
            title: { zh: "中文", en: "English" },
          },
          onSubmit: vi.fn(),
          renderSubmitButton: false,
        }),
      );
    });

    expect(container.textContent).toContain("启用");
    expect(container.textContent).toContain("自动");
    expect(
      Array.from(container.querySelectorAll<HTMLInputElement>("input")).some(
        (input) => input.value === "中文",
      ),
    ).toBe(true);
    expect(container.textContent).toContain("en");
  });
});
