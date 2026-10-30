import { act } from "react";
import { createRoot } from "react-dom/client";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import Tiptap from "@/components/Editor/index";

vi.mock("@/components/Editor/config/toolbar-items", () => ({ toolbarItems: [] }));

it("updates external HTML without echoing edits or dirtying a reset baseline", async () => {
  let form: UseFormReturn<{ content: string }> | undefined;
  const onChange = vi.fn();
  function Harness() {
    form = useForm({ defaultValues: { content: "<p>Initial</p>" } });
    return (
      <>
        <Controller
          control={form.control}
          name="content"
          render={({ field }) => (
            <Tiptap
              value={field.value}
              onChange={(value) => {
                onChange(value);
                field.onChange(value);
              }}
            />
          )}
        />
        <span>{String(form.formState.isDirty)}</span>
      </>
    );
  }
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Harness />));
    await act(async () => form?.reset({ content: "External <b>bold</b>" }));
    const element = container.querySelector('[role="textbox"]');
    expect(element?.textContent).toBe("External bold");
    expect(onChange).not.toHaveBeenCalled();
    expect(form?.formState.isDirty).toBe(false);
    if (
      !element ||
      !("editor" in element) ||
      !(element.editor instanceof Editor)
    )
      throw new Error("Real editor missing");
    const editor = element.editor;
    await act(async () => editor.commands.setContent("<p>Typed</p>"));
    expect(onChange).toHaveBeenCalledWith("<p>Typed</p>");
    expect(form?.formState.isDirty).toBe(true);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
