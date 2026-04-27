"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
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
import { trpc } from "@/packages/trpc/client/trpc";
import { TagType } from "@/packages/trpc/api/modules/tag/types/tag.type";
import { TagEntity } from "@/packages/trpc/api/modules/tag/types/tag.entity";

type PostTagOption = Pick<TagEntity, "id" | "name">;

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
const MultiTag = ({ postId, title, type, value, onChange }: MultiTagProps): JSX.Element => {
  const selectedTags = value ?? [];

  /**
   * 搜索输入框的值。
   */
  const [input, setInput] = useState("");
  /**
   * 搜索结果中的标签选项列表。
   */
  const [options, setOptions] = useState<TagEntity[]>([]);
  /**
   * 搜索或数据加载的加载状态。
   */
  const [loading, setLoading] = useState(false);
  /**
   * Popover 组件的打开状态。
   */
  const [open, setOpen] = useState(false);
  /**
   * 用于搜索防抖的定时器引用。
   */
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * 标签列表查询参数。
   */
  const [searchParams, setSearchParams] = useState<{ name?: string }>({});

  const { data: searchResult, isFetching: isSearching } = trpc.tag.index.useQuery(searchParams, {
    enabled: !!searchParams.name,
  });
  const { mutateAsync: createTag, isPending: isCreating } = trpc.tag.create.useMutation();
  const { mutateAsync: updateTags, isPending: isUpdating } = trpc.post.updateTags.useMutation();

  useEffect(() => {
    setLoading(isSearching);
  }, [isSearching]);

  useEffect(() => {
    if (searchResult) {
      setOptions(searchResult.list ?? []);
    }
  }, [searchResult]);

  /**
   * 从已选标签列表中移除一个标签。
   * @param {string} id - 要移除的标签ID。
   */
  const removeTag = async (id: string) => {
    const updatedTags = selectedTags.filter((tag) => tag.id !== id);
    onChange(updatedTags);

    // 如果有 postId，更新中间表
    if (postId) {
      const ids = updatedTags.map((t) => t.id);
      try {
        await updateTags({ postId, tagIds: ids, type });
      } catch (error) {
        console.error("Failed to update tags:", error);
      }
    }
  };

  /**
   * 向已选标签列表中添加一个标签。
   * 如果标签已存在，则不执行任何操作。
   * @param tag - 要添加的标签对象。
   */
  const addTag = async (tag: PostTagOption) => {
    if (selectedTags.some((t) => t.id === tag.id)) return;
    const updatedTags = [...selectedTags, tag];
    onChange(updatedTags);

    // 如果有 postId，更新中间表
    if (postId) {
      const ids = updatedTags.map((t) => t.id);
      try {
        await updateTags({ postId, tagIds: ids, type });
      } catch (error) {
        console.error("Failed to update tags:", error);
      }
    }

    setInput("");
    setOpen(false);
  };

  /**
   * 创建新标签。
   * @param name - 标签名称。
   */
  const createNewTag = async (name: string) => {
    try {
      const newTag = await createTag({ name: { zh: name, en: name } });
      await addTag(newTag);
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  /**
   * 处理搜索输入框的值变化。
   * 实现搜索防抖，并在输入停止后触发标签搜索。
   * @param {string} value - 搜索输入框的当前值。
   */
  const handleSearch = (value: string) => {
    setInput(value);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      if (value) {
        setSearchParams({ name: value });
      } else {
        setOptions([]);
        setSearchParams({});
      }
    }, 300);
  };

  return (
    <div>
      <div className="font-medium mb-1">{title}</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 text-sm"
          >
            {tag.name?.zh ?? ""}
            <Button
              onClick={() => removeTag(tag.id)}
              variant="ghost"
              size="icon"
              className="size-4"
              disabled={isUpdating}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </Badge>
        ))}
      </div>
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
              {loading ? (
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
                        <Button
                          size="sm"
                          variant="link"
                          onClick={() => createNewTag(input)}
                          disabled={isCreating}
                        >
                          {isCreating ? "创建中..." : "新建"}
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
    </div>
  );
};

export default MultiTag;
