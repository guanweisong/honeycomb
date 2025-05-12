"use client";

import * as React from "react";
import {
  Dialog as BaseDialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@ui/components/dialog";
import { Button } from "@ui/components/button";

interface CustomDialogProps
  extends React.ComponentPropsWithoutRef<typeof BaseDialog> {
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onOK?: () => void | Promise<void>;
  OKProps?: React.ComponentProps<typeof Button>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({
  trigger,
  title,
  description,
  footer,
  children,
  className,
  onOK,
  OKProps,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  ...props
}: CustomDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setUncontrolledOpen;

  const [loading, setLoading] = React.useState(false);

  const handleOK = async () => {
    if (!onOK) return;
    setLoading(true);
    try {
      await onOK();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseDialog open={open} onOpenChange={setOpen} {...props}>
      {trigger && (
        <DialogTrigger asChild>
          {React.isValidElement(trigger)
            ? React.cloneElement(trigger as React.ReactElement<any>, {
                onClick: () => setOpen(true),
              })
            : trigger}
        </DialogTrigger>
      )}
      <DialogContent className={className}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
        {(footer || onOK) && (
          <DialogFooter>
            {footer}
            {onOK && (
              <Button
                onClick={handleOK}
                disabled={loading || OKProps?.disabled}
                {...OKProps}
              >
                {loading ? "处理中…" : OKProps?.children || "确定"}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </BaseDialog>
  );
}
