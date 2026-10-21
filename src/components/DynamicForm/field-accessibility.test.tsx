import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Form } from "../ui/form";
import { DynamicField } from "./DynamicField";
import type { FieldConfig } from "./types";

// Keep the real editor and form primitives; toolbar actions are unrelated here.
vi.mock("../editor/config/toolbar-items", () => ({ toolbarItems: [] }));

function TestForm({
  type,
  invalid = true,
  multiLang = false,
  disabled = false,
}: {
  type: FieldConfig["type"];
  invalid?: boolean;
  multiLang?: boolean;
  disabled?: boolean;
}) {
  const value =
    type === "switch"
      ? false
      : type === "calendar"
        ? "2026-10-15T00:00:00.000Z"
        : type === "calendar-range"
          ? { from: "2026-10-15", to: "2026-10-16" }
          : type === "richText"
            ? "<p>Draft</p>"
            : "draft";
  const form = useForm<Record<string, unknown>>({
    defaultValues: { value: multiLang ? { zh: value, en: value } : value },
  });

  useEffect(() => {
    const name = multiLang ? "value.zh" : "value";
    if (invalid) form.setError(name, { message: "Value is required" });
    else form.clearErrors(name);
  }, [form, invalid, multiLang]);

  return (
    <Form {...form}>
      <DynamicField
        name="value"
        label={<span>Field label</span>}
        type={type}
        disabled={() => disabled}
        multiLang={multiLang}
        options={[{ value: "draft", label: "Draft" }]}
      />
    </Form>
  );
}

const fieldCases: { type: FieldConfig["type"]; selector: string }[] = [
  { type: "text", selector: "input[type=text]" },
  { type: "password", selector: "input[type=password]" },
  { type: "textarea", selector: "textarea" },
  { type: "select", selector: "button[role=combobox]" },
  { type: "radio", selector: "[role=radiogroup]" },
  { type: "switch", selector: "button[role=switch]" },
  { type: "calendar", selector: "input" },
  { type: "calendar-range", selector: "input" },
  { type: "richText", selector: ".tiptap[contenteditable]" },
];

describe("DynamicField accessibility", () => {
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

  it.each(fieldCases)(
    "connects the $type control to its label and current validation message",
    async ({ type, selector }) => {
      await act(async () => root.render(<TestForm type={type} />));
      if (type === "richText") {
        await act(async () => {
          await import("../editor");
        });
      }

      const control = container.querySelector<HTMLElement>(selector);
      const label = container.querySelector<HTMLLabelElement>(
        "label[data-slot=form-label]",
      );
      const error = container.querySelector<HTMLElement>(
        "[data-slot=form-message]",
      );
      expect(control).not.toBeNull();
      expect(label).not.toBeNull();
      expect(error).not.toBeNull();
      expect(control?.id).toBeTruthy();
      expect(control?.id).toBe(label?.htmlFor);
      expect(label?.id).toBeTruthy();
      expect(control?.getAttribute("aria-labelledby")).toBe(label?.id);
      expect(control?.getAttribute("aria-invalid")).toBe("true");
      expect(control?.getAttribute("aria-describedby")?.split(" ")).toContain(
        error?.id,
      );

      await act(async () =>
        root.render(<TestForm type={type} invalid={false} />),
      );

      expect(control?.getAttribute("aria-invalid")).toBe("false");
      expect(
        control?.getAttribute("aria-describedby")?.split(" "),
      ).not.toContain(error?.id);
      expect(container.querySelector("[data-slot=form-message]")).toBeNull();
    },
  );

  it("keeps a real rich-text editor read-only until a dynamic disabled field is cleared", async () => {
    await act(async () => {
      root.render(<TestForm type="richText" disabled />);
      await import("../editor");
    });
    const editor = container.querySelector<HTMLElement>(".tiptap");
    expect(editor?.getAttribute("contenteditable")).toBe("false");
    expect(editor?.textContent).toBe("Draft");
    expect(container.querySelector("fieldset")?.disabled).toBe(true);
    await act(async () =>
      root.render(<TestForm type="richText" disabled={false} />),
    );
    expect(editor?.getAttribute("contenteditable")).toBe("true");
    expect(editor?.textContent).toBe("Draft");
    expect(container.querySelector("fieldset")?.disabled).toBe(false);
  });

  it("names the active multilingual control using the shared visible label", async () => {
    await act(async () => root.render(<TestForm type="text" multiLang />));

    const label = container.querySelector<HTMLLabelElement>("label");
    const control =
      container.querySelector<HTMLInputElement>("input[type=text]");
    expect(label?.id).toBeTruthy();
    expect(control?.getAttribute("aria-labelledby")).toBe(label?.id);
  });
});
