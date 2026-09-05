"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { DarkModeSwitch } from "react-toggle-dark-mode";
import { Theme } from "@/app/(blog)/types/Theme";

/**
 * 主题切换组件。
 * 允许用户在亮色和暗色主题之间切换，并展示图标弹簧动画。
 * @returns {JSX.Element | null} 主题切换按钮或 null。
 */
export const ThemeSwitcher = () => {
  /**
   * 组件是否已挂载。
   * 用于解决 `next-themes` 在服务器端渲染时的 `resolvedTheme` 不匹配问题。
   */
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  /**
   * 副作用钩子，用于动态设置 `<meta name="theme-color">`。
   * 根据当前主题更新主题颜色，以优化 PWA 体验。
   */
  useEffect(() => {
    if (!mounted) return;

    let themeColor = "white";
    switch (resolvedTheme) {
      case Theme.Dark:
        themeColor = "#111827";
        break;
      case Theme.Light:
        themeColor = "white";
        break;
    }

    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length) {
      metas.forEach((meta) => meta.setAttribute("content", themeColor));
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = themeColor;
      document.head.appendChild(meta);
    }
  }, [resolvedTheme, mounted]);

  /**
   * 副作用钩子，用于在组件挂载后设置 `mounted` 状态。
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  /**
   * 切换暗黑模式。
   * 图标动画由 react-toggle-dark-mode 驱动，避免页面快照遮挡弹簧过程。
   * @param {boolean} checked - 是否启用暗黑模式。
   */
  const toggleDarkMode = (checked: boolean) => {
    setTheme(checked ? Theme.Dark : Theme.Light);
  };

  const dark = resolvedTheme === Theme.Dark;

  return (
    <span data-testid="theme-switcher">
      <DarkModeSwitch
        aria-label="Toggle theme"
        data-checked={dark}
        size={20}
        checked={dark}
        onChange={toggleDarkMode}
        sunColor="#333"
        moonColor="#ccc"
      />
    </span>
  );
};
