import type React from "react";

export type FieldConfig = {
  name: string;
  label?: React.ReactNode;
  /** 仅在视觉上隐藏标签，保留控件的无障碍名称。 */
  labelHidden?: boolean;
  type:
    | "text"
    | "password"
    | "textarea"
    | "select"
    | "radio"
    | "calendar"
    | "richText";
  options?: { label: React.ReactNode; value: string }[];
  placeholder?: string;
  autoComplete?: React.ComponentProps<"input">["autoComplete"];
  disabled?: boolean;
  multiLang?: boolean;
};
