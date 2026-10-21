"use client";

import React from "react";
import { ChevronUp } from "lucide-react";
import { useScrolledPast } from "@/lib/hooks/use-scrolled-past";

/**
 * 返回顶部组件。
 * 当页面滚动超过一定距离时显示，点击可平滑滚动回页面顶部。
 * @returns {JSX.Element} 返回顶部按钮。
 */
const BackToTop = () => {
  const show = useScrolledPast(300);

  /**
   * 滚动到页面顶部。
   */
  const goTop = () => {
    window.scrollTo(0, 0);
  };

  return show ? (
    <button
      className="fixed text-3xl translate-x-96 transition-all bottom-10 right-1/3 bg-auto-back-gray w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      onClick={goTop}
      aria-label="Back to top"
    >
      <ChevronUp aria-hidden="true" />
    </button>
  ) : (
    <></>
  );
};

export default BackToTop;
