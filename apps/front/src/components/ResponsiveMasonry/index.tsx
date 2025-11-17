"use client";

import React, { useLayoutEffect, useState } from "react";

interface ResponsiveMasonryProps {
  children: React.ReactNode;
  columns?: number; // 默认列数（大屏）
  breakpoints?: Record<number, number>; // 小屏优先
  gap?: number;
}

export default function ResponsiveMasonry({
  children,
  columns = 1,
  breakpoints = { 640: 2, 1024: 3, 1440: 4 },
  gap = 16,
}: ResponsiveMasonryProps) {
  const [cols, setCols] = useState<number | null>(null); // 初始 null，SSR 不渲染

  // 客户端根据宽度计算列数
  useLayoutEffect(() => {
    function update() {
      const width = window.innerWidth;
      let matched = columns;

      Object.keys(breakpoints)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((bp) => {
          if (width >= bp) matched = breakpoints[bp];
        });

      setCols(matched);
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoints, columns]);

  // 🔥 SSR 时 cols === null，直接不渲染，避免闪烁
  if (cols === null) {
    return <div style={{ height: 1 }} />; // 或者 return null;
  }

  // 把 children 分配到各列
  const columnsArray = Array.from(
    { length: cols },
    () => [] as React.ReactNode[],
  );

  React.Children.forEach(children, (child, i) => {
    columnsArray[i % cols].push(child);
  });

  return (
    <div className="w-full flex" style={{ gap }}>
      {columnsArray.map((col, index) => (
        <div key={index} className="flex flex-col" style={{ gap }}>
          {col}
        </div>
      ))}
    </div>
  );
}
