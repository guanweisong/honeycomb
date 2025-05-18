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
} from "@honeycomb/ui/components/dialog";
import { Button } from "@honeycomb/ui/components/button";
import { cn } from "@honeycomb/ui/lib/utils";

import {
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  LucideIcon,
} from "lucide-react";

type DialogType = "default" | "danger" | "success" | "warning";

const typeIconMap: Record<DialogType, LucideIcon> = {
  default: Info,
  danger: XCircle,
  success: CheckCircle,
  warning: AlertTriangle,
};

const typeButtonVariantMap: Record<DialogType, "default" | "destructive"> = {
  default: "default",
  danger: "destructive",
  success: "default",
  warning: "default",
};

interface CustomDialogProps
  extends React.ComponentPropsWithoutRef<typeof BaseDialog> {
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  type?: DialogType;
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
  type,
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

  const Icon = type ? typeIconMap[type] : null;

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
            <div className="flex items-start gap-3">
              {Icon && (
                <Icon
                  className={cn("w-5 h-5 mt-0.5", {
                    "text-destructive": type === "danger",
                    "text-green-500": type === "success",
                    "text-yellow-500": type === "warning",
                    "text-primary": type === "default",
                  })}
                />
              )}
              <div>
                {title && <DialogTitle>{title}</DialogTitle>}
                {description && (
                  <DialogDescription className="!mt-3">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
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
                variant={type ? typeButtonVariantMap[type] : "default"}
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
