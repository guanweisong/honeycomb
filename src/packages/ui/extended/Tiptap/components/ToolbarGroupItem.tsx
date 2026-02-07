import { Editor } from "@tiptap/core";
import { ToolbarGroup } from "../config/toolbarItems";
import { ChevronDown } from "lucide-react";
import { cn } from "@/packages/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/packages/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/packages/ui/components/tooltip";
import { Button } from "@/packages/ui/components/button";

interface ToolbarGroupItemProps {
  editor: Editor;
  group: ToolbarGroup;
}

export function ToolbarGroupItem({ editor, group }: ToolbarGroupItemProps) {
  const { items, icon: groupIcon, label: groupLabel } = group;

  const activeItem = items.find((item) => item.isActive?.(editor));

  const triggerIcon = activeItem ? activeItem.icon : groupIcon;
  const triggerLabel = activeItem ? activeItem.label : groupLabel;

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "p-0 flex items-center w-auto h-9 hover:bg-gray-100 transition-colors",
                  activeItem &&
                    "bg-purple-50 hover:bg-purple-100 !text-purple-600",
                )}
              >
                <div className="flex items-center justify-center px-1 h-full rounded-md hover:bg-black/5 transition-colors">
                  {triggerIcon}
                  <ChevronDown className={"h-3 w-3 opacity-50"} />
                </div>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{triggerLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="start" className="min-w-auto">
        {items.map((item) => {
          if (item.render) {
            return <div key={item.label}>{item.render(editor)}</div>;
          }
          return (
            <DropdownMenuItem
              key={item.label}
              onClick={() => {
                item.onClick?.(editor);
              }}
            >
              <span
                className={cn(
                  "flex gap-2 cursor-pointer items-center",
                  item.isActive?.(editor) && "text-purple-600",
                )}
              >
                {item.icon}
                {item.label}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
