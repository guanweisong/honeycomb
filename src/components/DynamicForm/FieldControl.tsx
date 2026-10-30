"use client";

import type React from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import type { ControllerRenderProps } from "react-hook-form";
import { z } from "zod";
import { zhCN } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/Select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "cn";
import LoadingState from "@/components/LoadingState";
import type { FieldConfig } from "@/components/DynamicForm/types";

const Tiptap = dynamic(() => import("@/components/Editor"), {
  ssr: false,
  loading: () => <LoadingState variant="inline" label="正在加载编辑器…" />,
});
const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((module) => module.Calendar),
  { loading: () => <LoadingState variant="inline" label="正在加载日历…" /> },
);

type FieldControlProps = Pick<
  React.ComponentProps<"input">,
  "id" | "aria-describedby" | "aria-invalid" | "aria-labelledby"
> & {
  field: FieldConfig;
  name: string;
  controllerField: ControllerRenderProps<Record<string, unknown>, string>;
};

const dateValueSchema = z
  .union([z.date(), z.string(), z.number()])
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()));
/** 根据字段配置渲染具体控件，隔离 DynamicForm 的字段分派逻辑。 */
export function FieldControl({
  field,
  name,
  controllerField,
  ...controlAttributes
}: FieldControlProps) {
  const isDisabled = field.disabled ?? false;
  const { value, ...controllerProps } = controllerField;
  const commonProps = {
    disabled: isDisabled,
    ...controllerProps,
    ...controlAttributes,
  };
  const textValue =
    typeof value === "string" || typeof value === "number"
      ? value
      : Array.isArray(value) &&
          value.every((item): item is string => typeof item === "string")
        ? value
        : "";
  const stringValue = typeof value === "string" ? value : "";
  const options = field.options ?? [];

  switch (field.type) {
    case "text":
    case "password":
      return (
        <Input
          type={field.type}
          autoComplete={field.autoComplete}
          value={textValue}
          placeholder={field.placeholder}
          {...commonProps}
        />
      );
    case "textarea":
      return (
        <Textarea
          value={textValue}
          placeholder={field.placeholder}
          {...commonProps}
        />
      );
    case "select":
      return (
        <Select
          value={stringValue}
          options={options}
          className="w-full"
          placeholder={field.placeholder}
          {...commonProps}
        />
      );
    case "radio":
      return (
        <RadioGroup
          value={stringValue}
          onValueChange={controllerField.onChange}
          className="flex gap-4"
          {...commonProps}
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`${name}-${option.value}`}
              />
              <label htmlFor={`${name}-${option.value}`}>{option.label}</label>
            </div>
          ))}
        </RadioGroup>
      );
    case "calendar": {
      const parsed = dateValueSchema.safeParse(value);
      const date = parsed.success ? parsed.data : undefined;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Input
              {...commonProps}
              readOnly
              value={date ? format(date, "yyyy-MM-dd") : ""}
              placeholder={field.placeholder}
              className={cn(
                "w-full cursor-pointer text-left",
                isDisabled && "opacity-50",
              )}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={zhCN}
              selected={date}
              defaultMonth={date}
              onSelect={(date) => controllerField.onChange(date?.toISOString())}
              disabled={isDisabled}
            />
          </PopoverContent>
        </Popover>
      );
    }
    case "richText":
      return (
        <Tiptap
          disabled={isDisabled}
          onChange={controllerField.onChange}
          value={stringValue}
          {...controlAttributes}
        />
      );
    default:
      return <span className="text-red-500">未知字段类型：{field.type}</span>;
  }
}
