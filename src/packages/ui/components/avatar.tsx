"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/packages/ui/lib/utils";

export interface AvatarProps extends React.ComponentProps<
  typeof AvatarPrimitive.Root
> {
  url?: string;
  fallback?: React.ReactNode;
}

function Avatar({ className, url, fallback, children, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <AvatarPrimitive.Image
        src={url}
        data-slot="avatar-image"
        className="aspect-square size-full"
      />
      <AvatarPrimitive.Fallback
        data-slot="avatar-fallback"
        className="bg-muted flex size-full items-center justify-center rounded-full"
      >
        {fallback}
      </AvatarPrimitive.Fallback>
      {children}
    </AvatarPrimitive.Root>
  );
}

export { Avatar };
