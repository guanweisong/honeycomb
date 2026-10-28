import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { DynamicForm } from "@/components/DynamicForm/index";

afterEach(cleanup);

it("keeps editable input values and submits transformed schema output without losing other fields", async () => {
  const schema = z.object({
    count: z.string().transform(Number),
    title: z.string(),
  });
  const onSubmit = vi.fn<(value: z.output<typeof schema>) => void>();
  const { getByRole } = render(
    <DynamicForm
      schema={schema}
      fields={[
        { name: "count", label: "Count", type: "text" },
        { name: "title", label: "Title", type: "text" },
      ]}
      defaultValues={{ count: "3", title: "kept" }}
      onSubmit={onSubmit}
    />,
  );
  const count = getByRole("textbox", { name: "Count" });
  if (!(count instanceof HTMLInputElement))
    throw new Error("Count input missing");
  expect(count.value).toBe("3");
  fireEvent.change(count, { target: { value: "4" } });
  fireEvent.click(getByRole("button", { name: "提交" }));
  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith({ count: 4, title: "kept" }),
  );
  expect(count.value).toBe("4");
});
