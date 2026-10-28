import { act, createRef, Profiler, useImperativeHandle, type Ref } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm, type UseFormReturn } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Form } from "@/components/ui/form";
import { DynamicField } from "@/components/DynamicForm/DynamicField";
import type { FieldConfig } from "@/components/DynamicForm/types";

type FormValues = Record<string, unknown>;

function TestForm({
  field,
  initialValue = "Initial",
  formRef,
  onRender = () => {},
}: {
  field: FieldConfig;
  initialValue?: unknown;
  formRef: Ref<UseFormReturn<FormValues>>;
  onRender?: () => void;
}) {
  const form = useForm<FormValues>({
    defaultValues: { value: initialValue, other: "Initial" },
  });
  useImperativeHandle(formRef, () => form, [form]);

  return (
    <Form {...form}>
      <Profiler id="field" onRender={onRender}>
        <DynamicField {...field} />
      </Profiler>
      <DynamicField name="other" type="text" />
    </Form>
  );
}

describe("DynamicField subscriptions", () => {
  let container: HTMLDivElement;
  let root: Root;
  let formRef: ReturnType<typeof createRef<UseFormReturn<FormValues>>>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    formRef = createRef<UseFormReturn<FormValues>>();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  function form() {
    if (!formRef.current) throw new Error("Form is not mounted");
    return formRef.current;
  }

  function input(name = "value") {
    const element = container.querySelector<HTMLInputElement>(
      `input[name="${name}"]`,
    );
    if (!element) throw new Error(`Missing input ${name}`);
    return element;
  }

  it.each([
    { type: "text", initialValue: "Initial" },
    { type: "password", initialValue: "Initial" },
    { type: "textarea", initialValue: "Initial" },
    { type: "select", initialValue: "initial" },
    { type: "radio", initialValue: "initial" },
    { type: "calendar", initialValue: "2026-10-15" },
  ] satisfies { type: FieldConfig["type"]; initialValue: unknown }[])(
    "does not re-render a static $type field when another field is edited",
    async ({ type, initialValue }) => {
      const onRender = vi.fn();
      await act(async () =>
        root.render(
          <TestForm
            field={{
              name: "value",
              type,
              options: [{ value: "initial", label: "Initial" }],
            }}
            initialValue={initialValue}
            formRef={formRef}
            onRender={onRender}
          />,
        ),
      );
      onRender.mockClear();

      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set?.call(input("other"), "Changed");
        input("other").dispatchEvent(new Event("input", { bubbles: true }));
      });

      expect(form().getValues("other")).toBe("Changed");
      expect(onRender).not.toHaveBeenCalled();
    },
  );

  it("keeps static fields responsive to their own values, validation, and reset", async () => {
    await act(async () =>
      root.render(
        <TestForm field={{ name: "value", type: "text" }} formRef={formRef} />,
      ),
    );
    await act(async () => form().setValue("value", "Changed"));
    expect(input().value).toBe("Changed");
    await act(async () =>
      input().dispatchEvent(new FocusEvent("focusout", { bubbles: true })),
    );
    expect(form().getFieldState("value").isTouched).toBe(true);

    await act(async () => form().setError("value", { message: "Required" }));
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(
      container.querySelector('[data-slot="form-message"]')?.textContent,
    ).toBe("Required");

    await act(async () => form().reset({ value: "Reset", other: "Reset" }));
    expect(input().value).toBe("Reset");
    expect(input().getAttribute("aria-invalid")).toBe("false");
    expect(container.querySelector('[data-slot="form-message"]')).toBeNull();
  });

  it("updates boolean disabled props without replacing the field or losing its value", async () => {
    const render = (disabled: boolean) =>
      root.render(
        <TestForm
          field={{ name: "value", type: "text", disabled }}
          formRef={formRef}
        />,
      );
    await act(async () => render(false));
    const originalInput = input();
    await act(async () => form().setValue("value", "Draft"));
    await act(async () => render(true));
    expect(input().disabled).toBe(true);
    expect(input().value).toBe("Draft");
    await act(async () => render(false));
    expect(input().disabled).toBe(false);
    expect(input()).toBe(originalInput);
    input().focus();
    expect(document.activeElement).toBe(originalInput);
  });

  it("isolates static multilingual values while preserving language validation", async () => {
    const onRender = vi.fn();
    await act(async () =>
      root.render(
        <TestForm
          field={{ name: "value", type: "text", multiLang: true }}
          initialValue={{ zh: "中文", en: "English" }}
          formRef={formRef}
          onRender={onRender}
        />,
      ),
    );
    onRender.mockClear();
    await act(async () => form().setValue("other", "Changed"));
    expect(onRender).not.toHaveBeenCalled();
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input("value.zh"), "更新");
      input("value.zh").dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input("value.zh").value).toBe("更新");
    await act(async () => form().setError("value.en", { message: "Required" }));
    const englishTab = Array.from(
      container.querySelectorAll('[role="tab"]'),
    ).find((element) => element.textContent === "en");
    expect(englishTab?.className).toContain("text-red-600");
    await act(async () => form().clearErrors("value.en"));
    expect(englishTab?.className).not.toContain("text-red-600");
  });
});
