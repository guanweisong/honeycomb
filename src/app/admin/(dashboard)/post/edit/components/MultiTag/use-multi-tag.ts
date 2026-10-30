"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { notifyPublicSyncWarning } from "@/app/admin/(dashboard)/lib/action-state";
import { useCurrentUser } from "@/app/admin/(dashboard)/providers/use-current-user";
import { TagType } from "@/features/tag/types/tag.type";
import type { TagRecord as TagEntity } from "@/features/tag/types/tag.record";
import { clientLogger } from "@/lib/observability/client";
import { LogEvent } from "@/lib/observability/core/names";
import { trpc } from "@/lib/trpc/client/trpc";

export type PostTagOption = Pick<TagEntity, "id" | "name">;

/** 多标签选择器的查询、全局创建和本地选择状态。 */
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
  const selectedTags = useRef(value);
  const { user } = useCurrentUser();
  const generation = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    selectedTags.current = value;
  }, [value]);
  useEffect(() => {
    return () => {
      generation.current += 1;
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [postId, type, user?.id]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<{ name?: string }>({});
  const {
    data: searchResult,
    isFetching: isSearching,
    isError,
    isPlaceholderData,
    refetch: retrySearch,
  } = trpc.tag.index.useQuery(searchParams, { enabled: !!searchParams.name });
  const isCurrentSearch = Boolean(input) && input === searchParams.name;
  const searchFailed = isCurrentSearch && isError;
  const options =
    isCurrentSearch && !isError && !isPlaceholderData
      ? (searchResult?.list ?? [])
      : [];
  const { mutateAsync: createTag, isPending: isCreating } =
    trpc.tag.create.useMutation();

  const stageTags = (tags: PostTagOption[]) => {
    selectedTags.current = tags;
    onChange(tags);
  };

  const removeTag = (id: string) =>
    stageTags(selectedTags.current.filter((tag) => tag.id !== id));

  const addTag = (tag: PostTagOption) => {
    if (selectedTags.current.some((item) => item.id === tag.id)) return;
    stageTags([...selectedTags.current, { id: tag.id, name: tag.name }]);
    setInput("");
    setOpen(false);
  };

  const createNewTag = async (name: string) => {
    const requestGeneration = generation.current;
    try {
      const tag = await createTag({ name: { zh: name, en: name } });
      if (generation.current !== requestGeneration) return;
      addTag(tag);
      notifyPublicSyncWarning(tag, toast.warning);
    } catch {
      if (generation.current !== requestGeneration) return;
      clientLogger.error(LogEvent.clientError, {
        operation: "tag.create",
        outcome: "error",
      });
      toast.error("标签创建失败，请重试");
    }
  };

  const handleSearch = (value: string) => {
    setInput(value);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      setSearchParams(value ? { name: value } : {});
    }, 300);
  };

  return {
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
  };
}
