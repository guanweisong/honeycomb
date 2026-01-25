"use client";

import * as React from "react";
import { Checkbox as BaseCheckbox } from "../../components/checkbox"; // 根据实际路径调整
import { cn } from "../../lib/utils";

interface LabeledCheckboxProps extends React.ComponentProps<
  typeof BaseCheckbox
> {
  label?: React.ReactNode;
}

export function Checkbox({ label, ...props }: LabeledCheckboxProps) {
  return (
    <label className={cn("inline-flex items-center gap-2 cursor-pointer")}>
      <BaseCheckbox {...props} />
      {label && (
        <span className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </span>
      )}
    </label>
  );
}
