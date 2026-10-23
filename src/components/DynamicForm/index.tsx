"use client";

import React, { useEffect, useImperativeHandle, useRef } from "react";
import {
  useForm,
  FieldValues,
  UseFormReturn,
  DefaultValues,
} from "react-hook-form";
import { z, ZodObject, ZodRawShape } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form } from "../ui/form";
import { Button } from "../ui/button";
import LoadingState from "@/components/LoadingState";

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
  /** 会话初值；切换记录使用 key，保存后需要替换输入时显式调用 reset。 */
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
    submit: submitForm,
  }));

  return (
    <Form {...form}>
      <form
        onSubmit={submitForm}
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
        )}
      </form>
    </Form>
  );
}
