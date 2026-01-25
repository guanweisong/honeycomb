import { Button } from "@/packages/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/packages/ui/components/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/packages/ui/components/popover";
import { ReactNode } from "react";

interface ToolbarButtonProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ToolbarButton({
  icon,
  label,
  active,
  onClick,
  children,
  open,
  onOpenChange,
}: ToolbarButtonProps) {
  const button = (
    <Button
      type="button"
      size="icon"
      className={active ? "!text-purple-600" : ""}
      variant={"ghost"}
      onClick={onClick}
    >
      {icon}
    </Button>
  );

  // 如果有children，使用Popover包装
  if (children && open !== undefined && onOpenChange) {
    return (
      <TooltipProvider delayDuration={200}>
        <Popover open={open} onOpenChange={onOpenChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                {button}
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-72 p-3">
            {children}
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    );
  }

  // 普通按钮模式
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
