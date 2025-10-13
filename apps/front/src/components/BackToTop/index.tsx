"use client";

import React, { useEffect, useState } from "react";
import { useScroll } from "ahooks";
import { ChevronUp } from "lucide-react";

/**
 * 返回顶部组件。
 * 当页面滚动超过一定距离时显示，点击可平滑滚动回页面顶部。
 * @returns {JSX.Element} 返回顶部按钮。
 */
const BackToTop = () => {
  const scroll = useScroll();
  /**
   * 控制返回顶部按钮的显示与隐藏。
   */
  const [show, setShow] = useState(false);

  /**
   * 副作用钩子，用于根据页面滚动位置控制按钮的显示。
   * 当页面滚动距离超过 300px 时，显示返回顶部按钮。
   */
  useEffect(() => {
    // @ts-ignore
    setShow(scroll?.top > 300);
  }, [scroll?.top]);

  /**
   * 滚动到页面顶部。
   */
  const goTop = () => {
    window.scrollTo(0, 0);
  };

  return show ? (
    <a
      className="fixed text-3xl translate-x-96 transition-all bottom-10 right-1/3 bg-auto-back-gray w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:shadow-xl"
      onClick={goTop}
    >
      <ChevronUp />
    </a>
  ) : (
    <></>
  );
};

export default BackToTop;
