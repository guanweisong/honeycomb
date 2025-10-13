"use client";
import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * 主题提供者组件。
 * 封装了 `next-themes` 的 `ThemeProvider`，为应用提供主题切换功能。
 * @param {ThemeProviderProps} { children, ...props } - 组件属性。
 * @returns {JSX.Element} 主题提供者组件。
 */
const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};

export default ThemeProvider;
