import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FieldControl } from "./FieldControl";
import type { FieldConfig } from "./types";
import { TiptapMediaPickerProvider } from "../editor/media-picker";

const loadedModules = vi.hoisted(() => ({ calendar: false, editor: false }));

// Observe module evaluation while keeping the real controls and their behavior.
vi.mock("../ui/calendar", async (importOriginal) => {
  loadedModules.calendar = true;
  return importOriginal();
});
vi.mock("../editor", async (importOriginal) => {
  loadedModules.editor = true;
  return importOriginal();
});
vi.mock("../editor/config/toolbar-items", async () => {
  const { ToolbarImageItem } =
    await import("../editor/components/ToolbarImageItem");
  return {
    toolbarItems: [
      [
        {
          label: "image",
          render: (editor: import("@tiptap/core").Editor) => (
            <ToolbarImageItem editor={editor} />
          ),
        },
      ],
    ],
  };
});

function TestField({
  type,
  initialValue = "",
  disabled = false,
  onChange = () => {},
  inputRef = () => {},
}: {
  type: FieldConfig["type"];
  initialValue?: unknown;
  disabled?: boolean;
  onChange?: (value: unknown) => void;
  inputRef?: (element: unknown) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <FieldControl
      name="value"
      field={{ name: "value", type, disabled: () => disabled }}
      formValues={{ value }}
      id="field-control"
      aria-labelledby="field-label"
      aria-describedby="field-error"
      aria-invalid
      controllerField={{
        name: "value",
        value,
        onChange: (nextValue: unknown) => {
          setValue(nextValue);
          onChange(nextValue);
        },
        onBlur: () => {},
        ref: inputRef,
      }}
    />
  );
}

function dayButton(date: Date) {
  const button = document.querySelector<HTMLButtonElement>(
    `button[data-day="${date.toLocaleDateString("zh-CN")}"]`,
  );
  if (!button)
    throw new Error(`Calendar day is missing: ${date.toISOString()}`);
  return button;
}

describe("FieldControl lazy controls", () => {
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

  it("does not evaluate editor or calendar modules for a text-only form", async () => {
    await act(async () =>
      root.render(<TestField type="text" initialValue="Draft" />),
    );
    expect(container.querySelector("input")?.value).toBe("Draft");
    expect(loadedModules).toEqual({ calendar: false, editor: false });
  });

  it("shows an editor loading status before preserving content, changes, and accessibility", async () => {
    const onChange = vi.fn();
    act(() =>
      root.render(
        <TestField
          type="richText"
          initialValue="<p>Draft</p>"
          onChange={onChange}
        />,
      ),
    );
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "编辑器",
    );
    expect(container.querySelector('[role="textbox"]')).toBeNull();

    await act(async () => {
      await import("../editor");
    });
    const editorElement =
      container.querySelector<HTMLElement>('[role="textbox"]');
    expect(editorElement?.textContent).toBe("Draft");
    expect(editorElement?.id).toBe("field-control");
    expect(editorElement?.getAttribute("aria-labelledby")).toBe("field-label");
    expect(editorElement?.getAttribute("aria-describedby")).toBe("field-error");
    expect(editorElement?.getAttribute("aria-invalid")).toBe("true");
    expect(container.querySelector('[role="status"]')).toBeNull();

    const { Editor } = await import("@tiptap/core");
    if (
      !editorElement ||
      !("editor" in editorElement) ||
      !(editorElement.editor instanceof Editor)
    ) {
      throw new Error("Expected the real Tiptap editor on its DOM element");
    }
    const editor = editorElement.editor;
    await act(async () => editor.commands.setContent("<p>Updated</p>"));
    expect(onChange).toHaveBeenCalledWith("<p>Updated</p>");
    expect(editorElement.textContent).toBe("Updated");
    expect(loadedModules.calendar).toBe(false);
  });

  it("keeps the media picker provider available inside the loaded editor", async () => {
    const picker = vi.fn(() => (
      <span data-testid="media-picker">Media picker</span>
    ));
    await act(async () =>
      root.render(
        <TiptapMediaPickerProvider renderer={picker}>
          <TestField type="richText" initialValue="<p>Draft</p>" />
        </TiptapMediaPickerProvider>,
      ),
    );
    await act(async () => {
      await import("../editor");
    });
    expect(
      container.querySelector('[data-testid="media-picker"]')?.textContent,
    ).toBe("Media picker");
    await act(async () => container.querySelector("button")?.click());
    expect(picker).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: true, kind: "image" }),
    );
  });

  it("closes an open media picker on disable and preserves the editor for re-enabling", async () => {
    const { Editor } = await import("@tiptap/core");
    const render = (disabled: boolean) => (
      <TiptapMediaPickerProvider
        renderer={({ open }) =>
          open ? <span data-testid="open-picker">Open picker</span> : null
        }
      >
        <TestField
          type="richText"
          initialValue="<p>Draft</p>"
          disabled={disabled}
        />
      </TiptapMediaPickerProvider>
    );
    await act(async () => {
      root.render(render(false));
      await import("../editor");
    });
    const editorElement =
      container.querySelector<HTMLElement>('[role="textbox"]');
    if (
      !editorElement ||
      !("editor" in editorElement) ||
      !(editorElement.editor instanceof Editor)
    )
      throw new Error("Expected real editor");
    const editor = editorElement.editor;
    await act(async () => container.querySelector("button")?.click());
    expect(
      container.querySelector('[data-testid="open-picker"]'),
    ).not.toBeNull();
    await act(async () => root.render(render(true)));
    expect(container.querySelector('[data-testid="open-picker"]')).toBeNull();
    expect(editor.isEditable).toBe(false);
    expect(container.querySelector("button")?.matches(":disabled")).toBe(true);
    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector('[data-testid="open-picker"]')).toBeNull();
    await act(async () => root.render(render(false)));
    expect(editor.isEditable).toBe(true);
    expect(editorElement.editor).toBe(editor);
    await act(async () => editor.commands.insertContent("Updated"));
    expect(editorElement.textContent).toContain("Updated");
    await act(async () => container.querySelector("button")?.click());
    expect(
      container.querySelector('[data-testid="open-picker"]'),
    ).not.toBeNull();
  });

  it("keeps the calendar input and ref immediately available, then loads single-date selection on open", async () => {
    const currentDate = new Date();
    const selectedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      10,
    );
    const nextDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      12,
    );
    const inputRef = vi.fn();
    const onChange = vi.fn();
    await act(async () =>
      root.render(
        <TestField
          type="calendar"
          initialValue={selectedDate.toISOString()}
          inputRef={inputRef}
          onChange={onChange}
        />,
      ),
    );
    const input = container.querySelector("input");
    expect(input?.value).toMatch(/-10$/);
    expect(inputRef).toHaveBeenCalledWith(input);
    expect(input?.getAttribute("aria-labelledby")).toBe("field-label");
    expect(input?.getAttribute("aria-describedby")).toBe("field-error");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(loadedModules.calendar).toBe(false);

    act(() => input?.click());
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      "日历",
    );
    await act(async () => {
      await import("../ui/calendar");
    });
    expect(dayButton(selectedDate).getAttribute("data-selected-single")).toBe(
      "true",
    );
    await act(async () => dayButton(nextDate).click());
    expect(onChange).toHaveBeenLastCalledWith(nextDate.toISOString());
    expect(input?.value).toMatch(/-12$/);
  });

  it("preserves calendar-range values and selection after the calendar chunk loads", async () => {
    const currentDate = new Date();
    const from = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      10,
    );
    const to = new Date(currentDate.getFullYear(), currentDate.getMonth(), 12);
    const onChange = vi.fn();
    await act(async () =>
      root.render(<TestField type="calendar-range" onChange={onChange} />),
    );
    const input = container.querySelector("input");
    await act(async () => input?.click());
    await act(async () => {
      await import("../ui/calendar");
    });
    await act(async () => dayButton(from).click());
    await act(async () => dayButton(to).click());
    expect(onChange).toHaveBeenLastCalledWith({ from, to });
    expect(input?.value).toMatch(/-10 ~ \d{4}-\d{2}-12$/);
  });

  it.each(["calendar", "calendar-range"] as const)(
    "keeps disabled %s inputs unavailable",
    async (type) => {
      await act(async () => root.render(<TestField type={type} disabled />));
      const input = container.querySelector("input");
      expect(input?.disabled).toBe(true);
      await act(async () => input?.click());
      expect(document.querySelector('[data-slot="calendar"]')).toBeNull();
    },
  );
});
