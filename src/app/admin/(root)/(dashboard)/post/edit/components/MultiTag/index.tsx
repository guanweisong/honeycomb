"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
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
import AddTagDialog from "@/app/admin/(root)/(dashboard)/tag/components/AddTagDialog";
import { trpc } from "@/packages/trpc/client/trpc";
import { FormField, FormMessage } from "@/packages/ui/components/form";
import { tagMap } from "@/app/admin/constants/tagMap";

/**
 * 多标签选择组件的属性接口。
 */
export interface MultiTagProps {
  /**
   * 表单中用于存储标签的字段名称。
   */
  name: "galleryStyles" | "movieDirectors" | "movieActors" | "movieStyles";
  /**
   * 组件的标题，例如 "导演"、"演员" 等。
   */
  title: string;
}

/**
 * 多标签选择组件。
 * 允许用户从现有标签中选择或创建新标签，并将其关联到表单字段。
 * @param {MultiTagProps} { name, title } - 组件属性。
 * @returns {JSX.Element} 多标签选择器。
 */
const MultiTag = ({ name, title }: MultiTagProps): JSX.Element => {
  const { control, setValue, watch } = useFormContext();
  const selectedTags: any[] = watch(name) ?? [];

  /**
   * 搜索输入框的值。
   */
  const [input, setInput] = useState("");
  /**
   * 搜索结果中的标签选项列表。
   */
  const [options, setOptions] = useState<any[]>([]);
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
  const timeout = useRef<any>(null);
  /**
   * 标签列表查询参数。
   */
  const [searchParams, setSearchParams] = useState<any>({});
  /**
   * 获取标签列表的 tRPC 查询。
   * 用于搜索和展示可选标签。
   */
  const { data: searchResult, isFetching: isSearching } =
    trpc.tag.index.useQuery(searchParams, {
      enabled: !!searchParams.name,
    });

  useEffect(() => {
    setLoading(isSearching);
  }, [isSearching]);

  useEffect(() => {
    if (searchResult) {
      setOptions(searchResult.list ?? []);
    }
  }, [searchResult]);

  /**
   * 控制添加标签对话框的显示状态。
   */
  const [modalProps, setModalProps] = useState<{ open: boolean }>({
    open: false,
  });

  /**
   * 从已选标签列表中移除一个标签。
   * @param {string} id - 要移除的标签ID。
   */
  const removeTag = (id: string) => {
    const updatedTags = selectedTags.filter((tag) => tag.id !== id);
    setValue(name, updatedTags, { shouldDirty: true });
    setValue(
      tagMap[name],
      updatedTags.map((t) => t.id),
      { shouldDirty: true },
    );
  };

  /**
   * 向已选标签列表中添加一个标签。
   * 如果标签已存在，则不执行任何操作。
   * @param tag - 要添加的标签对象。
   */
  const addTag = (tag: any) => {
    if (selectedTags.some((t) => t.id === tag.id)) return;
    const updatedTags = [...selectedTags, tag];
    setValue(name, updatedTags, { shouldDirty: true });
    setValue(
      tagMap[name],
      updatedTags.map((t) => t.id),
      { shouldDirty: true },
    );
    setInput("");
    setOpen(false);
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
        setOptions([]); // Clear options if search input is empty
        setSearchParams({});
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
              {selectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="gap-1 text-sm"
                >
                  {tag.name.zh}
                  <Button
                    onClick={() => removeTag(tag.id)}
                    variant="ghost"
                    size="icon"
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
                      {tag.name.zh}
                    </CommandItem>
                  ))}
                  {options.length === 0 && input && (
                    <CommandEmpty>
                      <div className="text-xs px-2 py-1">
                        无匹配，你可以
                        <Button
                          size="sm"
                          variant="link"
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
        onClose={() => setModalProps({ open: false })}
        onSuccess={() => setModalProps({ open: false })}
      />
    </div>
  );
};

export default MultiTag;
