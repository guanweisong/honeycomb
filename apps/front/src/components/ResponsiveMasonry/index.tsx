"use client";

import React, { useState, useEffect, useRef, ReactNode } from "react";

interface ResponsiveMasonryProps {
  children: React.ReactNode[];
  minColumns?: number;
  maxColumns?: number;
  minColumnWidth?: number; // 每列最小宽度
  gap?: number;
}

export default function ResponsiveMasonry({
  children,
  minColumns = 1,
  maxColumns = 5,
  minColumnWidth = 260, // 手机端自动 1 列
  gap = 16,
}: ResponsiveMasonryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(minColumns);
  const [masonryCols, setMasonryCols] = useState<React.ReactNode[][]>(
    Array.from({ length: minColumns }, () => []),
  );

  // 🔥 根据容器宽度自动计算列数
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      let nextCols = Math.floor(containerWidth / minColumnWidth);

      if (nextCols < minColumns) nextCols = minColumns;
      if (nextCols > maxColumns) nextCols = maxColumns;

      setCols(nextCols);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [minColumns, maxColumns, minColumnWidth]);

  // 🔥 每当 children 或 cols 变化时重新分配
  useEffect(() => {
    const newCols: ReactNode[][] = Array.from({ length: cols }, () => []);
    const heights = Array.from({ length: cols }, () => 0);

    children.forEach((child) => {
      const shortest = heights.indexOf(Math.min(...heights));
      newCols[shortest].push(child);
      heights[shortest] += 1;
    });

    setMasonryCols(newCols);
  }, [children, cols]);

  return (
    <div ref={containerRef} className="w-full flex" style={{ gap }}>
      {masonryCols.map((col, i) => (
        <div key={i} className="flex flex-col" style={{ gap }}>
          {col}
        </div>
      ))}
    </div>
  );
}
