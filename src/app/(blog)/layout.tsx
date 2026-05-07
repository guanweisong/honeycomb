import { ReactNode, Suspense } from "react";
import { Providers } from "./Providers";

/**
 * 根布局组件的属性类型。
 */
type Props = {
  /**
   * 子组件，即页面内容。
   */
  children: ReactNode;
};

/**
 * 根布局组件。
 * 该组件包裹了整个应用，并提供全局的上下文和资源。
 * @param {Props} { children } - 组件属性。
 * @returns {JSX.Element} 根布局。
 */
export default function RootLayout({ children }: Props): ReactNode {
  return <Suspense fallback={null}><Providers>{children}</Providers></Suspense>;
}
