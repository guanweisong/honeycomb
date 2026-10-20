"use client";

import { useEffect, useState } from "react";

export interface ScrollPosition {
  left: number;
  top: number;
}

/** 订阅窗口滚动位置；服务端和首次渲染使用稳定的零值。 */
export function useScrollPosition(): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>({ left: 0, top: 0 });

  useEffect(() => {
    const update = () => {
      setPosition({ left: window.scrollX, top: window.scrollY });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return position;
}
