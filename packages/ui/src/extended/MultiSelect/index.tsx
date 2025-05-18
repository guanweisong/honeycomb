import { useState } from "react";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@honeycomb/ui/components/command";
import { Checkbox } from "@honeycomb/ui/components/checkbox";
import { Popover } from "@honeycomb/ui/extended/Popover";
import { PopoverProps } from "@honeycomb/ui/extended/Popover";
import { Option } from "commander";

export interface MultiSelectProps extends PopoverProps {
  options?: Option[];
  value?: string[];
  onChange?: (values: string[]) => void;
}

export function MultiSelect(props: MultiSelectProps) {
  const { options = [], value = [], onChange, ...rest } = props;
  const [open, setOpen] = useState(false);

  const handleChange = (data: string) => {
    onChange?.(
      value.includes(data) ? value.filter((v) => v !== data) : [...value, data],
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      {...rest}
      content={
        <Command>
          <CommandInput placeholder="搜索" />
          <CommandList>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                disabled={option.disabled}
                onSelect={() => handleChange(option.value)}
                className="flex items-center gap-2"
              >
                <Checkbox checked={value.includes(option.value)} />
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      }
    />
  );
}
