"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@honeycomb/ui/components/badge";
import { Button } from "@honeycomb/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@honeycomb/ui/components/popover";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@honeycomb/ui/components/command";
import { X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import type { TagEntity } from "@/app/(root)/(dashboard)/tag/types/tag.entity";
import type { PostEntity, TagReadOnly } from "../../../types/post.entity";
import AddTagDialog from "@/app/(root)/(dashboard)/tag/components/AddTagDialog";
import { FormField, FormMessage } from "@honeycomb/ui/components/form";
import { trpc } from "@honeycomb/trpc/client/trpc";

export interface MultiTagProps {
  name: "galleryStyles" | "movieDirectors" | "movieActors" | "movieStyles";
  detail?: PostEntity;
  title: string;
  onTagsChange: (
    name: MultiTagProps["name"],
    tags: Omit<TagEntity, "updatedAt" | "createdAt">[],
  ) => void;
}

const MultiTag = (props: MultiTagProps) => {
  const { name, detail, title, onTagsChange } = props;
  const { control, setValue } = useFormContext();

  const [input, setInput] = useState("");
  const [options, setOptions] = useState<TagReadOnly[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeout = useRef<any>(null);
  const [searchParams, setSearchParams] = useState<any>({});
  const listQuery = trpc.tag.index.useQuery(searchParams, { enabled: false });

  const [modalProps, setModalProps] = useState<{
    open: boolean;
  }>({
    open: false,
  });

  const getTags = (): TagReadOnly[] => detail?.[name] ?? [];

  const removeTag = (id: string) => {
    const filtered = getTags().filter((tag) => tag.id !== id);
    onTagsChange(name, filtered);
  };

  const addTag = (tag: TagReadOnly) => {
    if (getTags().some((t) => t.id === tag.id)) return;
    const newTags = [...getTags(), tag];
    onTagsChange(name, newTags);
    setInput("");
    setOpen(false);
  };

  const handleSearch = (value: string) => {
    setInput(value);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        setSearchParams({ name: value });
        const { data } = await listQuery.refetch();
        setOptions((data as any)?.list ?? []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);
  };


  return (
    <div>
      <div className="font-medium mb-1">{title}</div>
      <FormField
        name={name}
        control={control}
        render={() => (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {getTags().map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="gap-1 text-sm"
                >
                  {tag.name.zh}
                  <Button
                    onClick={() => removeTag(tag.id)}
                    variant="ghost"
                    size={"icon"}
                    className="size-4"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </Badge>
              ))}
            </div>
            <FormMessage />
          </>
        )}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Plus />
            添加
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[220px]">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="搜索标签"
              value={input}
              onValueChange={handleSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  {options.map((tag) => (
                    <CommandItem key={tag.id} onSelect={() => addTag(tag)}>
                      {tag.name.zh}
                    </CommandItem>
                  ))}
                  {options.length === 0 && input && (
                    <CommandEmpty>
                      <div className="text-xs px-2 py-1">
                        无匹配，你可以
                        <Button
                          size={"sm"}
                          variant={"link"}
                          onClick={() => setModalProps({ open: true })}
                        >
                          新建标签
                        </Button>
                      </div>
                    </CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <AddTagDialog
        {...modalProps}
        onClose={() =>
          setModalProps((prevState) => ({ ...prevState, open: false }))
        }
        onSuccess={() => {
          setModalProps({ open: false });
        }}
      />
    </div>
  );
};

export default MultiTag;
