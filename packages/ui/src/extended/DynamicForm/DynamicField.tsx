"use client";

import React from "react";
import {
  useFormContext,
  ControllerRenderProps,
  useWatch,
} from "react-hook-form";

import { Input } from "@honeycomb/ui/components/input";
import { Textarea } from "@honeycomb/ui/components/textarea";
import { Select } from "../Select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@honeycomb/ui/components/popover";
import {
  RadioGroup,
  RadioGroupItem,
} from "@honeycomb/ui/components/radio-group";
import { Switch } from "@honeycomb/ui/components/switch";
import { Calendar } from "@honeycomb/ui/components/calendar";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@honeycomb/ui/components/form";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@honeycomb/ui/components/tabs";

import dynamic from "next/dynamic";
import { cn } from "@honeycomb/ui/lib/utils";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { zhCN } from "date-fns/locale";
const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
});

const supportedLangs = ["zh", "en"] as const;

export type FieldConfig = {
  name: string;
  label?: React.ReactNode;
  type:
    | "text"
    | "password"
    | "textarea"
    | "select"
    | "radio"
    | "switch"
    | "calendar"
    | "calendar-range"
    | "richText";
  options?:
    | { label: React.ReactNode; value: string }[]
    | ((formValues: any) => { label: React.ReactNode; value: string }[]);
  placeholder?: string;
  disabled?: (formValues: any) => boolean;
  multiLang?: boolean;
};

export function DynamicField(field: FieldConfig) {
  const form = useFormContext();
  const formValues = useWatch({ control: form.control });

  const renderSingleField = (
    name: string,
    controllerField: ControllerRenderProps<any, string>,
  ) => {
    const isDisabled =
      typeof field.disabled === "function" ? field.disabled(formValues) : false;

    const commonProps = {
      disabled: isDisabled,
      ...controllerField,
    };

    switch (field.type) {
      case "text":
      case "password":
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );

      case "textarea":
        return <Textarea placeholder={field.placeholder} {...commonProps} />;

      case "select": {
        const opts =
          typeof field.options === "function"
            ? field.options(formValues)
            : field.options;

        return (
          <Select
            options={opts}
            className="w-full"
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
      }

      case "radio": {
        const opts =
          typeof field.options === "function"
            ? field.options(formValues)
            : (field.options ?? []);

        return (
          <RadioGroup
            onValueChange={controllerField.onChange}
            className="flex gap-4"
            {...commonProps}
          >
            {opts.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`${name}-${opt.value}`} />
                <label htmlFor={`${name}-${opt.value}`}>{opt.label}</label>
              </div>
            ))}
          </RadioGroup>
        );
      }

      case "switch":
        return (
          <Switch
            checked={!!controllerField.value}
            onCheckedChange={controllerField.onChange}
            {...commonProps}
          />
        );

      case "calendar":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Input
                readOnly
                value={
                  controllerField.value
                    ? format(controllerField.value, "yyyy-MM-dd")
                    : ""
                }
                placeholder={field.placeholder}
                className={cn(
                  "w-full cursor-pointer text-left",
                  commonProps.disabled && "opacity-50",
                )}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={zhCN}
                selected={controllerField.value}
                onSelect={(date) => {
                  controllerField.onChange(date?.toISOString());
                }}
                disabled={commonProps.disabled}
              />
            </PopoverContent>
          </Popover>
        );

      case "calendar-range": {
        const range: DateRange | undefined = controllerField.value;

        const displayValue =
          range?.from && range?.to
            ? `${format(range.from, "yyyy-MM-dd")} ~ ${format(range.to, "yyyy-MM-dd")}`
            : "";
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Input
                readOnly
                value={displayValue}
                placeholder={field.placeholder}
                className={cn(
                  "w-full cursor-pointer",
                  commonProps.disabled && "opacity-50",
                )}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                locale={zhCN}
                selected={range}
                onSelect={controllerField.onChange}
                disabled={commonProps.disabled}
              />
            </PopoverContent>
          </Popover>
        );
      }

      case "richText":
        return (
          <SimpleMDE
            className="markdown-body"
            onChange={controllerField.onChange}
            value={controllerField.value}
          />
        );

      default:
        return <span className="text-red-500">未知字段类型：{field.type}</span>;
    }
  };

  if (field.multiLang) {
    return (
      <FormItem key={field.name}>
        <Tabs defaultValue="zh">
          <div className="flex justify-between">
            <FormLabel>{field.label}</FormLabel>
            <TabsList>
              {supportedLangs.map((lang) => {
                const hasError = !!(form.formState.errors as any)?.[
                  field.name
                ]?.[lang];
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

          {supportedLangs.map((lang) => (
            <TabsContent key={lang} value={lang}>
              <FormField
                control={form.control}
                name={`${field.name}.${lang}`}
                render={({ field: controllerField }) => (
                  <>
                    <FormControl>
                      {renderSingleField(
                        `${field.name}.${lang}`,
                        controllerField,
                      )}
                    </FormControl>
                    <FormMessage />
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
    <FormItem key={field.name}>
      {field.label && <FormLabel>{field.label}</FormLabel>}
      <FormField
        control={form.control}
        name={field.name}
        render={({ field: controllerField }) => (
          <>
            <FormControl>
              {renderSingleField(field.name, controllerField)}
            </FormControl>
            <FormMessage />
          </>
        )}
      />
    </FormItem>
  );
}
