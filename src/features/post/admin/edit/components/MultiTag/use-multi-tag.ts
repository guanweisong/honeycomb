"use client";

import { useEffect, useRef, useState } from "react";
import { TagType } from "@/packages/domain/content/tag";
import { TagEntity } from "@/packages/trpc/api/outputs";
import { clientLogger } from "@/packages/infrastructure/observability/client";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import { trpc } from "@/packages/trpc/client/trpc";

export type PostTagOption = Pick<TagEntity, "id" | "name">;

/** 多标签选择器的查询、创建和关联状态。 */
export function useMultiTag({
  postId,
  type,
  value,
  onChange,
}: {
  postId: string;
  type: TagType;
  value: PostTagOption[];
  onChange: (tags: PostTagOption[]) => void;
}) {
  const selectedTags = value ?? [];
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<TagEntity[]>([]);
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchParams, setSearchParams] = useState<{ name?: string }>({});
  const { data: searchResult, isFetching: isSearching } =
    trpc.tag.index.useQuery(searchParams, { enabled: !!searchParams.name });
  const { mutateAsync: createTag, isPending: isCreating } =
    trpc.tag.create.useMutation();
  const { mutateAsync: updateTags, isPending: isUpdating } =
    trpc.post.updateTags.useMutation();

  useEffect(() => {
    if (searchResult) setOptions(searchResult.list ?? []);
  }, [searchResult]);

  const updateTagRelation = async (tags: PostTagOption[], operation: string) => {
    onChange(tags);
    if (!postId) return;
    try {
      await updateTags({ postId, tagIds: tags.map((tag) => tag.id), type });
    } catch {
      clientLogger.error(LogEvent.clientError, { operation, outcome: "error" });
    }
  };

  const removeTag = (id: string) =>
    updateTagRelation(
      selectedTags.filter((tag) => tag.id !== id),
      "tag.remove",
    );

  const addTag = async (tag: PostTagOption) => {
    if (selectedTags.some((item) => item.id === tag.id)) return;
    await updateTagRelation([...selectedTags, tag], "tag.add");
    setInput("");
    setOpen(false);
  };

  const createNewTag = async (name: string) => {
    try {
      await addTag(await createTag({ name: { zh: name, en: name } }));
    } catch {
      clientLogger.error(LogEvent.clientError, {
        operation: "tag.create",
        outcome: "error",
      });
    }
  };

  const handleSearch = (value: string) => {
    setInput(value);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      if (value) setSearchParams({ name: value });
      else {
        setOptions([]);
        setSearchParams({});
      }
    }, 300);
  };

  return {
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
  };
}
