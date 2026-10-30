"use client";

import React, { JSX } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { X, Plus } from "lucide-react";
import { TagType } from "@/features/tag/types/tag.type";
import { Permission } from "@/lib/auth/permissions";
import { useCan } from "@/app/admin/(dashboard)/providers/use-current-user";
import LoadingState from "@/components/LoadingState";
import { PostTagOption, useMultiTag } from "@/app/admin/(dashboard)/post/edit/components/MultiTag/use-multi-tag";

/**
 * 多标签选择组件的属性接口。
 */
export interface MultiTagProps {
  /**
   * 文章 ID，用于隔离异步标签创建结果
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
 * 允许用户从现有标签中选择或创建新标签，并暂存选择，随文章表单统一保存。
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
    options,
    open,
    removeTag,
    retrySearch,
    searchFailed,
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
                type="button"
                aria-label={`移除标签 ${tag.name?.zh || tag.name?.en || tag.id}`}
                onClick={() => removeTag(tag.id)}
                variant="ghost"
                size="icon"
                className="size-4"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
            >
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
                    <LoadingState
                      variant="inline"
                      label="正在搜索标签..."
                      visuallyHiddenLabel
                    />
                  </div>
                ) : searchFailed ? (
                  <div className="px-2 py-2 text-sm">
                    <p role="alert">标签搜索失败，请重试</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => void retrySearch()}
                    >
                      重试
                    </Button>
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
                              type="button"
                              size="sm"
                              variant="link"
                              onClick={() => createNewTag(input)}
                              disabled={isCreating}
                            >
                              {isCreating ? (
                                <LoadingState
                                  variant="inline"
                                  label="创建中..."
                                />
                              ) : (
                                "新建"
                              )}
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
