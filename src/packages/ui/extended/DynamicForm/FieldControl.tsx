"use client";

import type React from "react";
import { format } from "date-fns";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";
import type { DateRange } from "react-day-picker";
import { zhCN } from "date-fns/locale";
import { Input } from "../../components/input";
import { Textarea } from "../../components/textarea";
import { Select } from "../Select";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/popover";
import { RadioGroup, RadioGroupItem } from "../../components/radio-group";
import { Switch } from "../../components/switch";
import { Calendar } from "../../components/calendar";
import { cn } from "../../lib/utils";
import Tiptap from "../Tiptap";
import type { FieldConfig } from "./types";

type FieldControlProps = {
  field: FieldConfig;
  name: string;
  controllerField: ControllerRenderProps<FieldValues, string>;
  formValues: FieldValues;
};

/** 根据字段配置渲染具体控件，隔离 DynamicForm 的字段分派逻辑。 */
export function FieldControl({
  field,
  name,
  controllerField,
  formValues,
}: FieldControlProps) {
  const isDisabled = field.disabled?.(formValues) ?? false;
  const commonProps = { disabled: isDisabled, ...controllerField };
  const options =
    typeof field.options === "function"
      ? field.options(formValues)
      : (field.options ?? []);

  switch (field.type) {
    case "text":
    case "password":
      return <Input type={field.type} placeholder={field.placeholder} {...commonProps} />;
    case "textarea":
      return <Textarea placeholder={field.placeholder} {...commonProps} />;
    case "select":
      return <Select options={options} className="w-full" placeholder={field.placeholder} {...commonProps} />;
    case "radio":
      return (
        <RadioGroup onValueChange={controllerField.onChange} className="flex gap-4" {...commonProps}>
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
              <label htmlFor={`${name}-${option.value}`}>{option.label}</label>
            </div>
          ))}
        </RadioGroup>
      );
    case "switch":
      return <Switch checked={!!controllerField.value} onCheckedChange={controllerField.onChange} {...commonProps} />;
    case "calendar":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Input readOnly value={controllerField.value ? format(controllerField.value, "yyyy-MM-dd") : ""} placeholder={field.placeholder} className={cn("w-full cursor-pointer text-left", isDisabled && "opacity-50")} />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" locale={zhCN} selected={controllerField.value} onSelect={(date) => controllerField.onChange(date?.toISOString())} disabled={isDisabled} />
          </PopoverContent>
        </Popover>
      );
    case "calendar-range": {
      const range: DateRange | undefined = controllerField.value;
      const displayValue = range?.from && range?.to ? `${format(range.from, "yyyy-MM-dd")} ~ ${format(range.to, "yyyy-MM-dd")}` : "";
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Input readOnly value={displayValue} placeholder={field.placeholder} className={cn("w-full cursor-pointer", isDisabled && "opacity-50")} />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" locale={zhCN} selected={range} onSelect={controllerField.onChange} disabled={isDisabled} />
          </PopoverContent>
        </Popover>
      );
    }
    case "richText":
      return <Tiptap onChange={controllerField.onChange} value={controllerField.value} />;
    default:
      return <span className="text-red-500">未知字段类型：{field.type}</span>;
  }
}
