import * as React from "react";
import {
  Sheet as BaseSheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "../ui/sheet";

import { Button } from "../ui/button";
import LoadingState from "@/components/LoadingState";

interface SheetProps extends Pick<
  React.ComponentProps<typeof SheetContent>,
  "side"
> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  showFooter?: boolean;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm?: () => void;
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = "right",
  showFooter = false,
  confirmText = "确定",
  cancelText = "取消",
  loading = false,
  onConfirm,
  className = "",
}: SheetProps) {
  return (
    <BaseSheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={className}>
        {(title || description) && (
          <SheetHeader>
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}

        <div className="flex-1 overflow-auto px-4">{children}</div>

        {showFooter && (
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">{cancelText}</Button>
            </SheetClose>
            <Button onClick={onConfirm} disabled={loading}>
              {loading ? (
                <LoadingState variant="inline" label="Loading..." />
              ) : (
                confirmText
              )}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </BaseSheet>
  );
}
