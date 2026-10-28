import type { CSSProperties } from "react";
import type { PinnedShadowEdge } from "@/components/DataTable/usePinnedColumnOffsets";

interface PinnedColumnShadowProps {
  edge: PinnedShadowEdge;
  style: CSSProperties;
}

const shadowColor =
  "color-mix(in oklab, var(--foreground) 10%, transparent)";

export function PinnedColumnShadow({ edge, style }: PinnedColumnShadowProps) {
  const extendsRight = edge === "right";

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-0 bottom-0 w-3"
      style={{
        ...style,
        background: extendsRight
          ? `linear-gradient(to right, ${shadowColor}, transparent)`
          : `linear-gradient(to right, transparent, ${shadowColor})`,
      }}
    />
  );
}
