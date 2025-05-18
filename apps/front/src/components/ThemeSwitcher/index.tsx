"use client";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { DarkModeSwitch } from "react-toggle-dark-mode";
import { Theme } from "@/types/Theme";
import { flushSync } from "react-dom";

export const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 设置 <meta name="theme-color"> 动态更新
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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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
