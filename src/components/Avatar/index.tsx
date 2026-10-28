"use client";

import type { ComponentProps, ReactNode } from "react";
import * as BaseAvatar from "@/components/ui/avatar";

export interface AvatarProps extends Omit<
  ComponentProps<typeof BaseAvatar.Avatar>,
  "children"
> {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
}

export default function Avatar({
  src,
  alt = "",
  fallback,
  ...rootProps
}: AvatarProps) {
  return (
    <BaseAvatar.Avatar {...rootProps}>
      {src ? <BaseAvatar.AvatarImage src={src} alt={alt} /> : null}
      <BaseAvatar.AvatarFallback>{fallback ?? "?"}</BaseAvatar.AvatarFallback>
    </BaseAvatar.Avatar>
  );
}
