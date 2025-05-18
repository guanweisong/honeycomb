"use client";

import * as React from "react";
import * as BasePopover from "@honeycomb/ui/components/popover";
import type { ComponentProps } from "react";

export interface PopoverProps
  extends Omit<ComponentProps<typeof BasePopover.Popover>, "children"> {
  trigger: React.ReactNode;
  content?: React.ReactNode;
  align?: ComponentProps<typeof BasePopover.PopoverContent>["align"];
  sideOffset?: ComponentProps<typeof BasePopover.PopoverContent>["sideOffset"];
  className?: string;
}

export function Popover({
  trigger,
  content,
  align = "center",
  sideOffset = 4,
  className,
  ...props
}: PopoverProps) {
  return (
    <BasePopover.Popover {...props}>
      <BasePopover.PopoverTrigger asChild>{trigger}</BasePopover.PopoverTrigger>
      <BasePopover.PopoverContent
        align={align}
        sideOffset={sideOffset}
        className={className}
      >
        {content}
      </BasePopover.PopoverContent>
    </BasePopover.Popover>
  );
}
