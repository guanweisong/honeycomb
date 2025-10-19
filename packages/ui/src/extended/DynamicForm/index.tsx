"use client";

import React, { useImperativeHandle, forwardRef, useState } from "react";
import {
  useForm,
  FieldValues,
  UseFormReturn,
  DefaultValues,
  Resolver,
} from "react-hook-form";
import { z, ZodObject } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form } from "@honeycomb/ui/components/form";
import { Button } from "@honeycomb/ui/components/button";

import { DynamicField, FieldConfig } from "./DynamicField";

export type DynamicFormRef<T extends FieldValues = any> = {
  setValue: UseFormReturn<T>["setValue"];
  getValues: UseFormReturn<T>["getValues"];
  reset: UseFormReturn<T>["reset"];
  setValues: (values: Partial<T>) => void;
  submit: () => void | Promise<void>;
};

interface DynamicFormProps<TSchema extends ZodObject<any>> {
  schema: TSchema;
  fields: FieldConfig[];
  defaultValues?: DefaultValues<z.infer<TSchema>>;
  onSubmit: (values: z.infer<TSchema>) => void;
  inline?: boolean;
  submitProps?: React.ComponentProps<typeof Button>;
  renderSubmitButton?: boolean;
}

export const DynamicForm = forwardRef(function <TSchema extends ZodObject<any>>(
  {
    schema,
    fields,
    defaultValues,
    onSubmit,
    inline = false,
    submitProps,
    renderSubmitButton = true,
  }: DynamicFormProps<TSchema>,
  ref: React.Ref<DynamicFormRef<z.infer<TSchema>>>,
) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema) as unknown as Resolver<z.infer<TSchema>>,
    mode: "onBlur",
    defaultValues,
  });

  useImperativeHandle(ref, () => ({
    setValue: form.setValue,
    getValues: form.getValues,
    reset: form.reset,
    setValues: (values) => {
      Object.entries(values).forEach(([key, value]) => {
        form.setValue(key as any, value, {
          shouldValidate: true,
          shouldDirty: true,
        });
      });
    },
    submit: () => {
      return form.handleSubmit(onSubmit)();
    },
  }));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          try {
            setLoading(true);
            onSubmit?.(values);
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
});
