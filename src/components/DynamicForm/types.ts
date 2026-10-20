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
    | "switch"
    | "calendar"
    | "calendar-range"
    | "richText";
  options?:
    | { label: React.ReactNode; value: string }[]
    | ((
        formValues: Record<string, unknown>,
      ) => { label: React.ReactNode; value: string }[]);
  placeholder?: string;
  disabled?: (formValues: Record<string, unknown>) => boolean;
  multiLang?: boolean;
};
