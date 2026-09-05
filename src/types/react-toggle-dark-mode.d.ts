declare module "react-toggle-dark-mode" {
  import type {
    ButtonHTMLAttributes,
    CSSProperties,
    FunctionComponent,
  } from "react";

  export interface Props
    extends Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "children" | "onChange"
    > {
    checked: boolean;
    onChange: (checked: boolean) => void;
    style?: CSSProperties;
    size?: number | string;
    moonColor?: string;
    sunColor?: string;
  }

  export const DarkModeSwitch: FunctionComponent<Props>;
}
