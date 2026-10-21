"use client";

import { useEffect, useState } from "react";

/** Subscribe to a scroll threshold rather than every pixel of window position. */
export function useScrolledPast(threshold: number): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return visible;
}
