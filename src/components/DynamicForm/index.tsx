"use client";

import React, { useEffect, useRef } from "react";
import { useForm, DefaultValues } from "react-hook-form";
import { z, ZodObject, ZodRawShape } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/LoadingState";

import {
  DynamicField,
  FieldConfig,
} from "@/components/DynamicForm/DynamicField";

interface DynamicFormProps<TShape extends ZodRawShape> {
  schema: ZodObject<TShape>;
  fields: FieldConfig[];
  /** 会话初值；首次到达后不覆盖本地输入，切换记录或会话使用 key。 */
  defaultValues?: DefaultValues<z.input<ZodObject<TShape>>>;
  onSubmit: (values: z.output<ZodObject<TShape>>) => void | Promise<void>;
  inline?: boolean;
  submitProps?: React.ComponentProps<typeof Button>;
}

export function DynamicForm<TShape extends ZodRawShape>({
  schema,
  fields,
  defaultValues,
  onSubmit,
  inline = false,
  submitProps,
}: DynamicFormProps<TShape>) {
  const initializedDefaults = useRef(defaultValues !== undefined);

  const form = useForm<
    z.input<ZodObject<TShape>>,
    unknown,
    z.output<ZodObject<TShape>>
  >({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues,
  });

  const { isSubmitting } = form.formState;
  const submitForm = form.handleSubmit((values) => onSubmit(values));

  useEffect(() => {
    if (!initializedDefaults.current && defaultValues !== undefined) {
      form.reset(defaultValues);
      initializedDefaults.current = true;
    }
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={submitForm}
        className={inline ? "flex gap-2" : "space-y-4"}
      >
        {fields.map((field) => (
          <DynamicField key={field.name} {...field} />
        ))}

        <div className="flex gap-2 justify-center">
          <Button
            type="submit"
            className={`cursor-pointer ${inline ? "" : "mt-2"}`}
            disabled={isSubmitting}
            {...submitProps}
          >
            {isSubmitting ? (
              <LoadingState variant="inline" label="处理中..." />
            ) : (
              (submitProps?.children ?? "提交")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
