import { ReactNode } from "react";
import { Providers } from "./Providers";

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return <Providers>{children}</Providers>;
}
