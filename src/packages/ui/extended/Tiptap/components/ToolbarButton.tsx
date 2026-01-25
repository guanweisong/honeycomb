import { Button } from "@/packages/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/packages/ui/components/tooltip";
import { ReactNode } from "react";

interface ToolbarButtonProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function ToolbarButton({
  icon,
  label,
  active,
  onClick,
}: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            className={active ? "!text-purple-600" : ""}
            variant={"ghost"}
            onClick={onClick}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
