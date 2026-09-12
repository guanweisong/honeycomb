"use client";

import { useEffect, useState } from "react";

/** Reports whether the component has completed its first client effect. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted;
}
