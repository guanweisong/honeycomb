"use client";

import React from "react";
import {
  useFormContext,
  useWatch,
  type ControllerRenderProps,
} from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { FieldControl } from "@/components/DynamicForm/FieldControl";
import type { FieldConfig } from "@/components/DynamicForm/types";

import { supportedLanguages as supportedLangs } from "@/lib/i18n/i18n";

export type { FieldConfig } from "@/components/DynamicForm/types";

/** 动态表单字段容器，负责表单绑定、多语言字段和错误展示。 */
export function DynamicField(field: FieldConfig) {
  const labelId = React.useId();
  const form = useFormContext<Record<string, unknown>>();
  useWatch({
    control: form.control,
    disabled: !field.disabled && typeof field.options !== "function",
  });

  const renderField = (
    name: string,
    controllerField: ControllerRenderProps<Record<string, unknown>, string>,
  ) => (
    <>
      <FormControl>
        <FieldControl
          field={field}
          name={name}
          controllerField={controllerField}
          formValues={form.getValues()}
          aria-labelledby={field.label ? labelId : undefined}
        />
      </FormControl>
      <FormMessage />
    </>
  );

  if (field.multiLang) {
    return (
      <FormItem key={field.name}>
        <Tabs defaultValue="zh">
          <div className="flex justify-between">
            <Label id={labelId}>{field.label}</Label>
            <TabsList>
              {supportedLangs.map((lang) => {
                const { error } = form.getFieldState(
                  `${field.name}.${lang}`,
                  form.formState,
                );
                return (
                  <TabsTrigger
                    key={lang}
                    value={lang}
                    className={error ? "text-red-600" : ""}
                  >
                    {lang}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          {supportedLangs.map((lang) => (
            <TabsContent key={lang} value={lang}>
              <FormField
                control={form.control}
                name={`${field.name}.${lang}`}
                render={({ field: controllerField }) =>
                  renderField(`${field.name}.${lang}`, controllerField)
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      </FormItem>
    );
  }

  return (
    <FormField
      control={form.control}
      name={field.name}
      render={({ field: controllerField }) => (
        <FormItem key={field.name}>
          {field.label && <FormLabel id={labelId}>{field.label}</FormLabel>}
          {renderField(field.name, controllerField)}
        </FormItem>
      )}
    />
  );
}
