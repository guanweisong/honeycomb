"use client";

import { useEffect, useRef, PropsWithChildren } from "react";
import { Fancybox, type FancyboxOptions } from "@fancyapps/ui/dist/fancybox";

export function FancyboxClient({
  children,
  options,
}: PropsWithChildren<{
  options?: Partial<FancyboxOptions>;
}>) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    Fancybox.bind(rootRef.current, "[data-fancybox]", options);

    return () => {
      Fancybox.unbind(rootRef.current);
    };
  }, [options]);

  return <div ref={rootRef}>{children}</div>;
}
