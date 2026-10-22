"use client";

import * as React from "react";
import * as BaseSelect from "../ui/select";
import type { SelectProps as BaseSelectProps } from "radix-ui/select";

type Option = {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
};

interface SelectProps
  extends
    Omit<BaseSelectProps, "onValueChange" | "value">,
    Pick<
      React.ComponentProps<typeof BaseSelect.SelectTrigger>,
      | "size"
      | "ref"
      | "onBlur"
      | "id"
      | "aria-describedby"
      | "aria-invalid"
      | "aria-labelledby"
    > {
  value?: string;
  onChange?: (value: string) => void;
  options?: Option[];
  placeholder?: string;
  disabled?: boolean;
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
  ref,
  onBlur,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  "aria-labelledby": labelledBy,
  ...rootProps
}: SelectProps) {
  return (
    <BaseSelect.Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      {...rootProps}
    >
      <BaseSelect.SelectTrigger
        ref={ref}
        onBlur={onBlur}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-labelledby={labelledBy}
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
