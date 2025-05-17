"use client";

import React, { useImperativeHandle, forwardRef } from "react";
import {
  useForm,
  useWatch,
  FieldValues,
  UseFormReturn,
  PathValue,
  FieldPath,
} from "react-hook-form";
import { z, ZodTypeAny } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import { RadioGroup, RadioGroupItem } from "@ui/components/radio-group";
import { Switch } from "@ui/components/switch";
import { Calendar } from "@ui/components/calendar";
import { Button } from "@ui/components/button";

export type DynamicFormRef<T extends FieldValues = any> = Pick<
  UseFormReturn<T>,
  "setValue" | "getValues" | "reset"
>;

interface DynamicFormProps<TSchema extends ZodTypeAny> {
  schema: TSchema;
  fields: FieldConfig<TSchema>[];
  defaultValues?: Partial<z.infer<TSchema>>;
  onSubmit: (values: z.infer<TSchema>) => void;
  loading?: boolean;
  inline?: boolean;
  labelPosition?: "top" | "left";
  submitProps?: React.ComponentProps<typeof Button>;
}

type FieldConfig<TSchema extends ZodTypeAny = ZodTypeAny> = {
  name: FieldPath<z.infer<TSchema>>;
  label?: string;
  type:
    | "text"
    | "password"
    | "textarea"
    | "select"
    | "radio"
    | "switch"
    | "calendar"
    | "calendar-range";
  fields?: FieldConfig[];
  options?:
    | { label: string; value: string }[]
    | ((formValues: any) => { label: string; value: string }[]);
  placeholder?: string;
  hidden?: (formValues: any) => boolean;
  disabled?: (formValues: any) => boolean;
};

export const DynamicForm = forwardRef(function <TSchema extends ZodTypeAny>(
  {
    schema,
    fields,
    defaultValues = {},
    onSubmit,
    loading = false,
    inline = false,
    labelPosition = "top",
    submitProps,
  }: DynamicFormProps<TSchema>,
  ref: React.Ref<DynamicFormRef<z.infer<TSchema>>>,
) {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: defaultValues as any,
  });

  const formValues = useWatch({ control: form.control });

  useImperativeHandle(ref, () => ({
    setValue: form.setValue,
    getValues: form.getValues,
    reset: form.reset,
  }));

  const renderField = (
    field: FieldConfig<TSchema>,
    controllerField: any,
    values: any,
  ): React.ReactNode => {
    const fieldDisabled = field.disabled?.(values) ?? false;
    const fieldHidden = field.hidden?.(values) ?? false;

    if (fieldHidden) return null;

    switch (field.type) {
      case "text":
      case "password":
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            disabled={fieldDisabled}
            {...controllerField}
            onBlur={(e) => {
              const trimmedValue = e.target.value.trim();
              const currentValue = controllerField.value;
              if (trimmedValue !== currentValue) {
                form.setValue(
                  field.name,
                  trimmedValue as PathValue<
                    z.infer<TSchema>,
                    typeof field.name
                  >,
                  { shouldValidate: true, shouldDirty: true },
                );
              }
              controllerField.onBlur();
            }}
          />
        );
      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            disabled={fieldDisabled}
            {...controllerField}
            onBlur={(e) => {
              const trimmedValue = e.target.value.trim();
              const currentValue = controllerField.value;
              if (trimmedValue !== currentValue) {
                form.setValue(
                  field.name,
                  trimmedValue as PathValue<
                    z.infer<TSchema>,
                    typeof field.name
                  >,
                  { shouldValidate: true, shouldDirty: true },
                );
              }
              controllerField.onBlur();
            }}
          />
        );
      case "select":
        const opts =
          typeof field.options === "function"
            ? field.options(values)
            : field.options;
        return (
          <Select
            disabled={fieldDisabled}
            onValueChange={controllerField.onChange}
            value={controllerField.value}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {opts?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "radio":
        const radioOptions =
          typeof field.options === "function"
            ? field.options(values)
            : field.options;
        return (
          <RadioGroup
            onValueChange={controllerField.onChange}
            value={controllerField.value}
            className="flex items-center gap-4"
            disabled={fieldDisabled}
          >
            {radioOptions?.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={opt.value} />
                <label htmlFor={opt.value}>{opt.label}</label>
              </div>
            ))}
          </RadioGroup>
        );
      case "switch":
        return (
          <Switch
            disabled={fieldDisabled}
            checked={controllerField.value}
            onCheckedChange={controllerField.onChange}
          />
        );
      case "calendar":
        return (
          <Calendar
            mode="single"
            selected={controllerField.value}
            onSelect={controllerField.onChange}
            disabled={fieldDisabled}
          />
        );
      case "calendar-range":
        return (
          <Calendar
            mode="range"
            selected={controllerField.value}
            onSelect={controllerField.onChange}
            disabled={fieldDisabled}
          />
        );
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={inline ? "flex gap-2" : "space-y-4"}
      >
        {fields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: controllerField }) => {
              const renderedField = renderField(
                field,
                controllerField,
                formValues,
              );
              if (!renderedField) return <></>;
              return (
                <FormItem
                  className={
                    labelPosition === "left"
                      ? "flex items-center gap-4"
                      : "space-y-2"
                  }
                >
                  {field.label && (
                    <FormLabel
                      className={
                        labelPosition === "left" ? "min-w-16 justify-end" : ""
                      }
                    >
                      {field.label}
                    </FormLabel>
                  )}
                  <div className="flex-1">
                    <FormControl>{renderedField}</FormControl>
                    <FormMessage className="text-left" />
                  </div>
                </FormItem>
              );
            }}
          />
        ))}
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
      </form>
    </Form>
  );
});
