"use client";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { DarkModeSwitch } from "react-toggle-dark-mode";
import { Theme } from "@/app/(blog)/types/Theme";
import { flushSync } from "react-dom";

/**
 * 主题切换组件。
 * 允许用户在亮色和暗色主题之间切换，并支持视图过渡动画。
 * @returns {JSX.Element | null} 主题切换按钮或 null。
 */
export const ThemeSwitcher = () => {
  /**
   * 组件是否已挂载。
   * 用于解决 `next-themes` 在服务器端渲染时的 `resolvedTheme` 不匹配问题。
   */
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

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
   * 支持视图过渡动画，提供更平滑的用户体验。
   * @param {boolean} checked - 是否启用暗黑模式。
   */
  const toggleDarkMode = async (checked: boolean) => {
    // 动画增强部分
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isViewTransitionSupported = !!document.startViewTransition;

    if (
      !buttonRef.current ||
      !isViewTransitionSupported ||
      prefersReducedMotion
    ) {
      setTheme(checked ? Theme.Dark : Theme.Light);
      return;
    }

    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(checked ? Theme.Dark : Theme.Light);
      });
    }).ready;

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 500,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  };

  return (
    <span ref={buttonRef}>
      <DarkModeSwitch
        size={20}
        checked={resolvedTheme === Theme.Dark}
        onChange={toggleDarkMode}
        sunColor="#333"
        moonColor="#ccc"
      />
    </span>
  );
};
