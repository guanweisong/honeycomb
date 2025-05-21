"use client";

import React, { useImperativeHandle, forwardRef, useState } from "react";
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
} from "@honeycomb/ui/components/form";
import { Input } from "@honeycomb/ui/components/input";
import { Textarea } from "@honeycomb/ui/components/textarea";
import { Select } from "../Select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@honeycomb/ui/components/radio-group";
import { Switch } from "@honeycomb/ui/components/switch";
import { Calendar } from "@honeycomb/ui/components/calendar";
import { Button } from "@honeycomb/ui/components/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@honeycomb/ui/components/tabs"; // 需要有 Tabs 组件支持

export type DynamicFormRef<T extends FieldValues = any> = Pick<
  UseFormReturn<T>,
  "setValue" | "getValues" | "reset"
>;

interface DynamicFormProps<TSchema extends ZodTypeAny> {
  schema: TSchema;
  fields: FieldConfig<TSchema>[];
  defaultValues?: Partial<z.infer<TSchema>>;
  onSubmit: (values: z.infer<TSchema>) => void;
  inline?: boolean;
  submitProps?: React.ComponentProps<typeof Button>;
}

type FieldConfig<TSchema extends ZodTypeAny = ZodTypeAny> = {
  name: FieldPath<z.infer<TSchema>>;
  label?: React.ReactNode;
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
    | { label: React.ReactNode; value: string }[]
    | ((formValues: any) => { label: React.ReactNode; value: string }[]);
  placeholder?: string;
  disabled?: (formValues: any) => boolean;
  multiLang?: boolean;
};

export const DynamicForm = forwardRef(function <TSchema extends ZodTypeAny>(
  {
    schema,
    fields,
    defaultValues = {},
    onSubmit,
    inline = false,
    submitProps,
  }: DynamicFormProps<TSchema>,
  ref: React.Ref<DynamicFormRef<z.infer<TSchema>>>,
) {
  const [loading, setLoading] = useState(false);

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
            options={opts}
            className="w-full"
            onChange={controllerField.onChange}
            value={controllerField.value}
            placeholder={field.placeholder}
          />
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
        onSubmit={form.handleSubmit(async (values) => {
          try {
            setLoading(true);
            await onSubmit(values);
          } finally {
            setLoading(false);
          }
        })}
        className={inline ? "flex gap-2" : "space-y-4"}
      >
        {fields.map((field) => {
          if (field.multiLang) {
            return (
              <FormItem key={field.name} className={"space-y-2"}>
                <Tabs defaultValue="zh" className="w-full">
                  <div className="flex justify-between">
                    {field.label && <FormLabel>{field.label}</FormLabel>}
                    <TabsList>
                      {["zh", "en"].map((lang) => {
                        const hasError =
                          // @ts-ignore
                          !!form.formState.errors?.[field.name]?.[lang];
                        return (
                          <TabsTrigger
                            key={lang}
                            value={lang}
                            className={hasError ? "text-red-600" : ""}
                          >
                            {lang}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>
                  {["zh", "en"].map((lang) => (
                    <TabsContent key={lang} value={lang}>
                      <FormField
                        control={form.control}
                        name={
                          `${field.name}.${lang}` as FieldPath<z.infer<TSchema>>
                        }
                        render={({ field: controllerField }) => (
                          <>
                            <FormControl>
                              {renderField(
                                { ...field, multiLang: false },
                                controllerField,
                                formValues,
                              )}
                            </FormControl>
                            <FormMessage className="text-left" />
                          </>
                        )}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </FormItem>
            );
          }

          return (
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
                return (
                  <FormItem className="space-y-2">
                    {field.label && <FormLabel>{field.label}</FormLabel>}
                    <div className="flex-1">
                      <FormControl>{renderedField}</FormControl>
                      <FormMessage className="text-left" />
                    </div>
                  </FormItem>
                );
              }}
            />
          );
        })}
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
