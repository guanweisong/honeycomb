import type React from "react";

export type FieldConfig = {
  name: string;
  label?: React.ReactNode;
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
