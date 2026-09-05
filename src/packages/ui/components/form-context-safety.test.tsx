import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { expect, it } from "vitest";
import { Form, FormItem, FormMessage } from "./form";

it("reports a missing field provider instead of looking up an undefined name", () => {
  function InvalidForm() {
    const form = useForm();
    return (
      <Form {...form}>
        <FormItem>
          <FormMessage />
        </FormItem>
      </Form>
    );
  }
  expect(() => renderToStaticMarkup(<InvalidForm />)).toThrow(
    "useFormField should be used within <FormField>",
  );
});
