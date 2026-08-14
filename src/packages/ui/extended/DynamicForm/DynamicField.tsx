"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../components/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/tabs";
import { FieldControl } from "./FieldControl";
import type { FieldConfig } from "./types";

const supportedLangs = ["zh", "en"] as const;

export type { FieldConfig } from "./types";

/** 动态表单字段容器，负责表单绑定、多语言字段和错误展示。 */
export function DynamicField(field: FieldConfig) {
  const form = useFormContext();
  const formValues = useWatch({ control: form.control });

  const renderField = (
    name: string,
    controllerField: Parameters<NonNullable<React.ComponentProps<typeof FormField>["render"]>>[0]["field"],
  ) => (
    <>
      <FormControl>
        <FieldControl field={field} name={name} controllerField={controllerField} formValues={formValues} />
      </FormControl>
      <FormMessage />
    </>
  );

  if (field.multiLang) {
    return (
      <FormItem key={field.name}>
        <Tabs defaultValue="zh">
          <div className="flex justify-between">
            <FormLabel>{field.label}</FormLabel>
            <TabsList>
              {supportedLangs.map((lang) => {
                const fieldErrors = form.formState.errors[field.name as keyof typeof form.formState.errors] as Record<(typeof supportedLangs)[number], unknown> | undefined;
                return <TabsTrigger key={lang} value={lang} className={fieldErrors?.[lang] ? "text-red-600" : ""}>{lang}</TabsTrigger>;
              })}
            </TabsList>
          </div>
          {supportedLangs.map((lang) => (
            <TabsContent key={lang} value={lang}>
              <FormField control={form.control} name={`${field.name}.${lang}`} render={({ field: controllerField }) => renderField(`${field.name}.${lang}`, controllerField)} />
            </TabsContent>
          ))}
        </Tabs>
      </FormItem>
    );
  }

  return (
    <FormItem key={field.name}>
      {field.label && <FormLabel>{field.label}</FormLabel>}
      <FormField control={form.control} name={field.name} render={({ field: controllerField }) => renderField(field.name, controllerField)} />
    </FormItem>
  );
}
