"use client";

import React, { JSX } from "react";
import { Badge } from "@/packages/ui/components/badge";
import { Button } from "@/packages/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/packages/ui/components/popover";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/packages/ui/components/command";
import { X, Loader2, Plus } from "lucide-react";
import { TagType } from "@/packages/domain/content/tag";
import { Permission } from "@/packages/identity/auth/permissions";
import { useCan } from "@/app/admin/hooks/use-current-user";
import { PostTagOption, useMultiTag } from "./use-multi-tag";

/**
 * 多标签选择组件的属性接口。
 */
export interface MultiTagProps {
  /**
   * 文章 ID，用于更新中间表
   */
  postId: string;
  /**
   * 组件的标题，例如 "导演"、"演员" 等。
   */
  title: string;
  /**
   * 标签类型：'actor', 'director', 'movie_style', 'gallery_style'
   */
  type: TagType;
  /**
   * 已选标签列表
   */
  value: PostTagOption[];
  /**
   * 标签变化回调
   */
  onChange: (tags: PostTagOption[]) => void;
}

/**
 * 多标签选择组件。
 * 允许用户从现有标签中选择或创建新标签，并通过中间表关联到文章。
 * @param {MultiTagProps} props - 组件属性。
 * @returns {JSX.Element} 多标签选择器。
 */
const MultiTag = ({
  postId,
  title,
  type,
  value,
  onChange,
}: MultiTagProps): JSX.Element => {
  const canManagePostTags = useCan(Permission.postManageTags);
  const canCreateTag = useCan(Permission.tagCreate);
  const selectedTags = value ?? [];

  const {
    addTag,
    createNewTag,
    handleSearch,
    input,
    isCreating,
    isSearching,
    isUpdating,
    options,
    open,
    removeTag,
    setOpen,
  } = useMultiTag({ postId, type, value: selectedTags, onChange });

  return (
    <div>
      <div className="font-medium mb-1">{title}</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="gap-1 text-sm">
            {tag.name?.zh ?? ""}
            {canManagePostTags && (
              <Button
                onClick={() => removeTag(tag.id)}
                variant="ghost"
                size="icon"
                className="size-4"
                disabled={isUpdating}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
          </Badge>
        ))}
      </div>
      {canManagePostTags && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1" />
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
                {isSearching ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    {options.map((tag) => (
                      <CommandItem key={tag.id} onSelect={() => addTag(tag)}>
                        {tag.name?.zh ?? ""}
                      </CommandItem>
                    ))}
                    {options.length === 0 && input && (
                      <CommandEmpty>
                        <div className="text-xs px-2 py-1">
                          无匹配，你可以
                          {canCreateTag && (
                            <Button
                              size="sm"
                              variant="link"
                              onClick={() => createNewTag(input)}
                              disabled={isCreating}
                            >
                              {isCreating ? "创建中..." : "新建"}
                            </Button>
                          )}
                        </div>
                      </CommandEmpty>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default MultiTag;
