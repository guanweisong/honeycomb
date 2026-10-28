import { createRef } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InputGroupInput } from "@/components/ui/input-group";

afterEach(cleanup);

it.each([Input, InputGroupInput])(
  "preserves native defaultValue and uncontrolled edits for %s",
  (Control) => {
    const warning = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const ref = createRef<HTMLInputElement>();
      const { getByRole, rerender } = render(
        <Control ref={ref} defaultValue="Initial" />,
      );
      const input = getByRole("textbox");
      if (!(input instanceof HTMLInputElement))
        throw new Error("Input missing");
      expect(input.value).toBe("Initial");
      fireEvent.change(input, { target: { value: "Draft" } });
      rerender(<Control ref={ref} defaultValue="Refreshed" />);
      expect(input.value).toBe("Draft");
      expect(ref.current).toBe(input);
      ref.current?.focus();
      expect(document.activeElement).toBe(input);
      expect(warning).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  },
);

it.each([Input, InputGroupInput])(
  "preserves explicitly controlled empty values for %s",
  (Control) => {
    const onChange = vi.fn();
    const { getByRole, rerender } = render(
      <Control value="Filled" onChange={onChange} />,
    );
    rerender(<Control value="" onChange={onChange} />);
    const input = getByRole("textbox");
    if (!(input instanceof HTMLInputElement)) throw new Error("Input missing");
    expect(input.value).toBe("");
  },
);

it.each([Input, InputGroupInput])(
  "forwards native registration and ref focus for %s",
  async (Control) => {
    function Registered() {
      const form = useForm({ defaultValues: { title: "Initial" } });
      return (
        <>
          <Control {...form.register("title")} />
          <button onClick={() => form.setFocus("title")}>Focus</button>
        </>
      );
    }
    const { getByRole } = render(<Registered />);
    fireEvent.click(getByRole("button"));
    await waitFor(() =>
      expect(document.activeElement).toBe(getByRole("textbox")),
    );
    const input = getByRole("textbox");
    if (!(input instanceof HTMLInputElement)) throw new Error("Input missing");
    expect(input.value).toBe("Initial");
  },
);
