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
} from "../../components/form";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/tabs";
import { Label } from "../../components/label";
import { FieldControl } from "./FieldControl";
import type { FieldConfig } from "./types";

import { supportedLanguages as supportedLangs } from "@/packages/domain/localization/i18n";

export type { FieldConfig } from "./types";

/** 动态表单字段容器，负责表单绑定、多语言字段和错误展示。 */
export function DynamicField(field: FieldConfig) {
  const form = useFormContext<Record<string, unknown>>();
  const formValues = useWatch({ control: form.control });

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
          formValues={formValues}
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
            <Label>{field.label}</Label>
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
          {field.label && <FormLabel>{field.label}</FormLabel>}
          {renderField(field.name, controllerField)}
        </FormItem>
      )}
    />
  );
}
