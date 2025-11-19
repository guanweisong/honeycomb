"use client";

import React from "react";

interface ResponsiveMasonryProps {
  children: React.ReactNode;
  columns?: number;
  breakpoints?: Record<number, number>;
  gap?: number;
}

export default function ResponsiveMasonry({
  children,
  columns = 1,
  breakpoints = { 640: 2, 1024: 3, 1440: 4 },
  gap = 16,
}: ResponsiveMasonryProps) {
  const sorted = Object.keys(breakpoints)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div
      className="responsive-masonry"
      style={{
        ["--cols-default" as any]: columns,
        ["--gap" as any]: `${gap}px`,
        ...Object.fromEntries(
          sorted.map((bp) => [`--cols-${bp}`, breakpoints[bp]]),
        ),
      }}
    >
      {React.Children.map(children, (child) => (
        <div className="masonry-item">{child}</div>
      ))}
    </div>
  );
}
