import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { DynamicForm, type DynamicFormRef } from "./index";

it("保留输入类型，提交经过转换的输出并支持局部设置", async () => {
  const schema = z.object({ count: z.string().transform(Number), title: z.string() });
  const ref = createRef<DynamicFormRef<z.input<typeof schema>>>();
  const onSubmit = vi.fn<(value: z.output<typeof schema>) => void>();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<DynamicForm
      ref={ref} schema={schema} fields={[]}
      defaultValues={{ count: "3", title: "kept" }} onSubmit={onSubmit}
    />));
    await act(async () => ref.current?.setValues({ count: "4" }));
    expect(ref.current?.getValues()).toEqual({ count: "4", title: "kept" });
    await act(async () => ref.current?.submit());
    expect(onSubmit).toHaveBeenCalledWith({ count: 4, title: "kept" });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
