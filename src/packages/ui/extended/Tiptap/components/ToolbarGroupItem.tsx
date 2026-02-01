import { Editor } from "@tiptap/core";
import { ToolbarGroup } from "../config/toolbarItems";
import { ToolbarButton } from "./ToolbarButton";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/packages/ui/lib/utils";

interface ToolbarGroupItemProps {
  editor: Editor;
  group: ToolbarGroup;
}

export function ToolbarGroupItem({ editor, group }: ToolbarGroupItemProps) {
  const [open, setOpen] = useState(false);
  const { items, icon: groupIcon, label: groupLabel } = group;

  const activeItem = items.find((item) => item.isActive?.(editor));

  const triggerIcon = activeItem ? activeItem.icon : groupIcon;
  const triggerLabel = activeItem ? activeItem.label : groupLabel;

  return (
    <ToolbarButton
      label={triggerLabel}
      active={!!activeItem}
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "p-0 flex items-center w-auto h-9 hover:bg-gray-100 transition-colors",
        activeItem && "bg-purple-50 hover:bg-purple-100",
      )}
      icon={
        <div className="flex items-center justify-center px-1 h-full rounded-md hover:bg-black/5 transition-colors">
          {triggerIcon}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </div>
      }
    >
      <div className="flex flex-col">
        {items.map((item) => {
          if (item.render) {
            return <div key={item.label}>{item.render(editor)}</div>;
          }
          return (
            <div
              key={item.label}
              className={cn(
                "flex gap-1 leading-8 cursor-pointer items-center rounded-md px-2 hover:bg-gray-100",
                {
                  "text-purple-600": item.isActive?.(editor),
                },
              )}
              onClick={() => {
                item.onClick?.(editor);
                setOpen(false);
              }}
            >
              {item.icon}
              {item.label}
            </div>
          );
        })}
      </div>
    </ToolbarButton>
  );
}
