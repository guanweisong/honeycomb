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
    { type: "switch", initialValue: true },
    { type: "calendar", initialValue: "2026-10-15" },
    {
      type: "calendar-range",
      initialValue: { from: "2026-10-15", to: "2026-10-16" },
    },
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

  it("still updates function-valued options from another field", async () => {
    await act(async () =>
      root.render(
        <TestForm
          field={{
            name: "value",
            type: "radio",
            options: (values) => [
              { value: "choice", label: String(values.other) },
            ],
          }}
          initialValue="choice"
          formRef={formRef}
        />,
      ),
    );
    expect(container.querySelector("label")?.textContent).toBe("Initial");
    await act(async () => form().setValue("other", "Updated option"));
    expect(container.querySelector("label")?.textContent).toBe(
      "Updated option",
    );
    expect(form().getValues("value")).toBe("choice");
  });

  it("still updates disabled callbacks from another field and reset", async () => {
    await act(async () =>
      root.render(
        <TestForm
          field={{
            name: "value",
            type: "text",
            disabled: (values) => values.other === "Locked",
          }}
          formRef={formRef}
        />,
      ),
    );
    expect(input().disabled).toBe(false);
    await act(async () => form().setValue("other", "Locked"));
    expect(input().disabled).toBe(true);
    await act(async () => form().reset({ value: "Reset", other: "Unlocked" }));
    expect(input().disabled).toBe(false);
    expect(input().value).toBe("Reset");
  });

  it("uses current values when callbacks are added after static edits", async () => {
    const render = (dependent: boolean) =>
      root.render(
        <TestForm
          field={{
            name: "value",
            type: "text",
            disabled: dependent
              ? (values) => values.other === "Locked"
              : undefined,
          }}
          formRef={formRef}
        />,
      );
    await act(async () => render(false));
    const originalInput = input();
    originalInput.focus();
    await act(async () => form().setValue("other", "Locked"));
    await act(async () => render(true));
    expect(input().disabled).toBe(true);
    await act(async () => render(false));
    expect(input().disabled).toBe(false);
    await act(async () => form().setValue("other", "Unlocked"));
    await act(async () => render(true));
    expect(input().disabled).toBe(false);
    expect(input()).toBe(originalInput);
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
