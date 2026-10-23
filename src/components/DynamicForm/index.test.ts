import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DynamicForm, type DynamicFormRef } from "./index";

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
    if (!input) throw new Error("dynamic form input was not rendered");

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setValue?.call(input, "更新后的标题");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      container
        .querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.click();
    });

    expect(onSubmit).toHaveBeenCalledWith({ title: "更新后的标题" });
  });

  it.each(["button", "imperative"] as const)(
    "keeps %s submission pending until the returned promise resolves",
    async (entry) => {
      const schema = z.object({ title: z.string() });
      const formRef = React.createRef<DynamicFormRef<{ title: string }>>();
      const pending = Promise.withResolvers<void>();
      const onSubmit = vi.fn(() => pending.promise);
      await act(async () => {
        root.render(
          React.createElement(DynamicForm<typeof schema.shape>, {
            schema,
            ref: formRef,
            fields: [{ name: "title", type: "text" }],
            defaultValues: { title: "Draft" },
            onSubmit,
            submitProps: { children: "保存" },
          }),
        );
      });
      const button = container.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
      if (!button) throw new Error("Submit button missing");
      let submission: void | Promise<void>;
      await act(async () => {
        if (entry === "imperative") submission = formRef.current?.submit();
        else button.click();
      });

      expect(onSubmit).toHaveBeenCalledWith({ title: "Draft" });
      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain("处理中...");
      await act(async () => {
        pending.resolve();
        await submission;
      });
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe("保存");
    },
  );

  it("clears imperative pending after rejection without losing the draft", async () => {
    const schema = z.object({ title: z.string() });
    const formRef = React.createRef<DynamicFormRef<{ title: string }>>();
    const pending = Promise.withResolvers<void>();
    await act(async () => {
      root.render(
        React.createElement(DynamicForm<typeof schema.shape>, {
          schema,
          ref: formRef,
          fields: [{ name: "title", type: "text" }],
          defaultValues: { title: "Initial" },
          onSubmit: () => pending.promise,
        }),
      );
    });
    await act(async () => formRef.current?.setValue("title", "Draft"));
    let rejection: Promise<unknown> | undefined;
    await act(async () => {
      rejection = Promise.resolve(formRef.current?.submit()).catch(
        (error: unknown) => error,
      );
    });
    const button = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(button?.disabled).toBe(true);
    await act(async () => {
      pending.reject(new Error("write failed"));
      expect(await rejection).toEqual(new Error("write failed"));
    });
    expect(button?.disabled).toBe(false);
    expect(button?.textContent).toBe("提交");
    expect(formRef.current?.getValues()).toEqual({ title: "Draft" });
  });

  it.each([true, false])(
    "preserves explicit submitProps.disabled=%s while pending",
    async (disabled) => {
      const schema = z.object({ title: z.string() });
      const formRef = React.createRef<DynamicFormRef<{ title: string }>>();
      const pending = Promise.withResolvers<void>();
      await act(async () => {
        root.render(
          React.createElement(DynamicForm<typeof schema.shape>, {
            schema,
            ref: formRef,
            fields: [{ name: "title", type: "text" }],
            defaultValues: { title: "Draft" },
            onSubmit: () => pending.promise,
            submitProps: { disabled },
          }),
        );
      });
      let submission: void | Promise<void>;
      await act(async () => {
        submission = formRef.current?.submit();
      });
      const button = container.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
      expect(button?.disabled).toBe(disabled);
      expect(button?.textContent).toContain("处理中...");
      await act(async () => {
        pending.resolve();
        await submission;
      });
      expect(button?.disabled).toBe(disabled);
    },
  );

  it("resets fields when async default values arrive", async () => {
    const schema = z.object({ title: z.string() });

    await act(async () => {
      root.render(
        React.createElement(DynamicForm, {
          schema,
          fields: [{ name: "title", label: "标题", type: "text" }],
          onSubmit: vi.fn(),
        }),
      );
    });

    await act(async () => {
      root.render(
        React.createElement(DynamicForm, {
          schema,
          fields: [{ name: "title", label: "标题", type: "text" }],
          defaultValues: { title: "异步加载的标题" },
          onSubmit: vi.fn(),
        }),
      );
    });

    expect(container.querySelector<HTMLInputElement>("input")?.value).toBe(
      "异步加载的标题",
    );
  });

  it("preserves a draft after failed submission and same-session defaults refresh", async () => {
    const schema = z.object({ title: z.string() });
    const formRef = React.createRef<DynamicFormRef<{ title: string }>>();
    const onSubmit = vi.fn().mockRejectedValue(new Error("write failed"));
    const render = (title: string) =>
      root.render(
        React.createElement(DynamicForm<typeof schema.shape>, {
          schema,
          ref: formRef,
          fields: [{ name: "title", type: "text" }],
          defaultValues: { title },
          onSubmit,
        }),
      );
    await act(async () => render("Initial"));
    await act(async () => formRef.current?.setValue("title", "Draft"));
    await act(async () => {
      await expect(formRef.current?.submit()).rejects.toThrow("write failed");
    });
    await act(async () => render("Refetched"));
    expect(container.querySelector("input")?.value).toBe("Draft");
    await act(async () => formRef.current?.reset({ title: "Explicit reset" }));
    expect(container.querySelector("input")?.value).toBe("Explicit reset");
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
    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(false);
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
