"use client";

import * as React from "react";
import * as BaseSelect from "../../components/select";
import { SelectProps as BaseSelectProps } from "@radix-ui/react-select";

type Option = {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
};

interface SelectProps extends Omit<BaseSelectProps, "onValueChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
  options?: Option[];
  placeholder?: string;
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
}

export function Select({
  value,
  onChange,
  options = [],
  placeholder,
  disabled,
  size = "default",
  className,
  ...props
}: SelectProps) {
  return (
    <BaseSelect.Select value={value} onValueChange={onChange} {...props}>
      <BaseSelect.SelectTrigger
        size={size}
        className={className}
        disabled={disabled}
      >
        <BaseSelect.SelectValue placeholder={placeholder} />
      </BaseSelect.SelectTrigger>
      <BaseSelect.SelectContent>
        {options.map((opt) => (
          <BaseSelect.SelectItem
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
          >
            {opt.label}
          </BaseSelect.SelectItem>
        ))}
      </BaseSelect.SelectContent>
    </BaseSelect.Select>
  );
}
