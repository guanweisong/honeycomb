import type React from "react";
import type { FieldValues } from "react-hook-form";

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
    | ((formValues: FieldValues) => { label: React.ReactNode; value: string }[]);
  placeholder?: string;
  disabled?: (formValues: FieldValues) => boolean;
  multiLang?: boolean;
};
