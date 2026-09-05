"use client";

import React, { useEffect, useImperativeHandle, useState } from "react";
import {
  useForm,
  FieldValues,
  UseFormReturn,
  DefaultValues,
} from "react-hook-form";
import { z, ZodObject, ZodRawShape } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form } from "../../components/form";
import { Button } from "../../components/button";

import { DynamicField, FieldConfig } from "./DynamicField";

export type DynamicFormRef<T extends FieldValues = FieldValues> = {
  setValue: UseFormReturn<T>["setValue"];
  getValues: UseFormReturn<T>["getValues"];
  reset: UseFormReturn<T>["reset"];
  setValues: (values: Partial<T>) => void;
  submit: () => void | Promise<void>;
};

interface DynamicFormProps<TShape extends ZodRawShape> {
  schema: ZodObject<TShape>;
  fields: FieldConfig[];
  defaultValues?: DefaultValues<z.input<ZodObject<TShape>>>;
  onSubmit: (values: z.output<ZodObject<TShape>>) => void | Promise<void>;
  ref?: React.Ref<DynamicFormRef<z.input<ZodObject<TShape>>>>;
  inline?: boolean;
  submitProps?: React.ComponentProps<typeof Button>;
  renderSubmitButton?: boolean;
}

export function DynamicForm<TShape extends ZodRawShape>({
  schema,
  fields,
  defaultValues,
  onSubmit,
  inline = false,
  submitProps,
  renderSubmitButton = true,
  ref,
}: DynamicFormProps<TShape>) {
  const [loading, setLoading] = useState(false);

  const form = useForm<
    z.input<ZodObject<TShape>>,
    unknown,
    z.output<ZodObject<TShape>>
  >({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues,
  });

  useEffect(() => {
    if (defaultValues) form.reset(defaultValues);
  }, [defaultValues, form]);

  useImperativeHandle(ref, () => ({
    setValue: form.setValue,
    getValues: form.getValues,
    reset: form.reset,
    setValues: (values) => {
      form.reset(
        { ...form.getValues(), ...values },
        { keepDefaultValues: true },
      );
      void form.trigger();
    },
    submit: () => form.handleSubmit((values) => onSubmit(values))(),
  }));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          setLoading(true);
          try {
            await onSubmit?.(values);
          } finally {
            setLoading(false);
          }
        })}
        className={inline ? "flex gap-2" : "space-y-4"}
      >
        {fields.map((field) => (
          <DynamicField key={field.name} {...field} />
        ))}

        {renderSubmitButton && (
          <div className="flex gap-2 justify-center">
            <Button
              type="submit"
              className={`cursor-pointer ${inline ? "" : "mt-2"}`}
              disabled={loading}
              {...submitProps}
            >
              {loading ? "处理中..." : (submitProps?.children ?? "提交")}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
