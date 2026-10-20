"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { notifyPublicSyncWarning } from "@/components/admin/action-state";
import { useCurrentUser } from "@/features/user/admin/use-current-user";
import { TagType } from "@/features/tag/tag-kind";
import type { TagRecord as TagEntity } from "@/features/tag/types";
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
  const [options, setOptions] = useState<TagEntity[]>([]);
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchParams, setSearchParams] = useState<{ name?: string }>({});
  const { data: searchResult, isFetching: isSearching } =
    trpc.tag.index.useQuery(searchParams, { enabled: !!searchParams.name });
  const { mutateAsync: createTag, isPending: isCreating } =
    trpc.tag.create.useMutation();

  useEffect(() => {
    if (searchResult) setOptions(searchResult.list ?? []);
  }, [searchResult]);

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
    options,
    open,
    removeTag,
    setOpen,
  };
}
