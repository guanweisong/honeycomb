import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Controller, useForm } from "react-hook-form";
import { afterEach, beforeEach, expect, it } from "vitest";
import { FieldControl } from "./FieldControl";

function TestForm() {
  const form = useForm<Record<string, unknown>>({
    defaultValues: { status: "draft" },
  });
  return (
    <>
      <Controller
        name="status"
        control={form.control}
        render={({ field }) => (
          <FieldControl
            name="status"
            field={{
              name: "status",
              type: "select",
              options: [{ value: "draft", label: "Draft" }],
            }}
            controllerField={field}
            formValues={form.getValues()}
            id="status"
            aria-describedby="status-help"
          />
        )}
      />
      <button onClick={() => form.setFocus("status")}>Focus status</button>
      <output>
        {form.formState.touchedFields.status ? "touched" : "untouched"}
      </output>
    </>
  );
}

let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<TestForm />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

it("focuses the real Select trigger through React Hook Form setFocus", async () => {
  const trigger = container.querySelector('[role="combobox"]');
  await act(async () => {
    container.querySelectorAll<HTMLButtonElement>("button")[1]?.click();
    // RHF schedules setFocus after the current event in the installed version.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(document.activeElement).toBe(trigger);
  expect(trigger?.id).toBe("status");
  expect(trigger?.getAttribute("aria-describedby")).toBe("status-help");
});

it("marks the Select field touched when its real trigger loses focus", async () => {
  const trigger =
    container.querySelector<HTMLButtonElement>('[role="combobox"]');
  expect(container.querySelector("output")?.textContent).toBe("untouched");
  await act(async () => trigger?.focus());
  await act(async () => trigger?.blur());
  expect(container.querySelector("output")?.textContent).toBe("touched");
});
