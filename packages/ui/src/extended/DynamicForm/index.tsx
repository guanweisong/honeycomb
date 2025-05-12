"use client";

import React, { useEffect } from "react";
import {
  useForm,
  useWatch,
  Path,
  FieldValues,
  UseFormReturn,
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
import { Switch } from "@ui/components/switch";
import { Calendar } from "@ui/components/calendar";
import { Button } from "@ui/components/button";

export type DynamicFormRef<T extends FieldValues = any> = Pick<
  UseFormReturn<T>,
  "setValue" | "getValues" | "reset"
> & {
  clear: () => void;
};

interface DynamicFormProps<TSchema extends ZodTypeAny> {
  schema: TSchema;
  fields: FieldConfig<TSchema>[];
  defaultValues?: z.infer<TSchema>;
  onSubmit: (values: z.infer<TSchema>) => void;
  loading?: boolean;
  formRef?: React.MutableRefObject<DynamicFormRef<z.infer<TSchema>> | null>;
  inline?: boolean;
  submitProps?: React.ComponentProps<typeof Button>; // 添加提交按钮的props配置
}

type FieldConfig<TSchema extends ZodTypeAny = ZodTypeAny> = {
  name: Path<z.infer<TSchema>>;
  label?: string;
  type:
    | "text"
    | "password"
    | "textarea"
    | "select"
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

export function DynamicForm<TSchema extends ZodTypeAny>({
  schema,
  fields,
  defaultValues = {},
  onSubmit,
  loading = false,
  formRef,
  inline = false,
  submitProps,
}: DynamicFormProps<TSchema>) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema as z.ZodType),
    defaultValues,
  });

  const formValues = useWatch({ control: form.control });

  useEffect(() => {
    if (formRef) {
      formRef.current = {
        setValue: form.setValue,
        getValues: form.getValues,
        reset: form.reset,
        clear: () => {
          const cleared: Record<string, any> = {};
          Object.keys(form.getValues()).forEach((key) => {
            cleared[key] = undefined;
          });
          form.reset(cleared);
        },
      };
    }
  }, [form, formRef]);

  const renderField = (
    field: FieldConfig<TSchema>,
    controllerField: any,
    values: any,
  ) => {
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
          />
        );
      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            disabled={fieldDisabled}
            {...controllerField}
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
                <FormItem>
                  {field.label && <FormLabel>{field.label}</FormLabel>}
                  <FormControl>{renderedField}</FormControl>
                  <FormMessage className="text-left" />
                </FormItem>
              );
            }}
          />
        ))}
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={loading}
          {...submitProps} // 将提交按钮的配置传递给 Button 组件
        >
          {submitProps?.children ?? "提交"}
        </Button>
      </form>
    </Form>
  );
}
