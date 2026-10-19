"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { notifyPublicSyncWarning } from "@/packages/ui/admin/action-state";
import { TagType } from "@/packages/domain/content/tag";
import type { TagViewModel as TagEntity } from "@/features/contracts";
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

  const updateTagRelation = async (
    tags: PostTagOption[],
    operation: string,
  ) => {
    onChange(tags);
    if (!postId) return;
    try {
      const result = await updateTags({
        postId,
        tagIds: tags.map((tag) => tag.id),
        type,
      });
      notifyPublicSyncWarning(result, toast.warning);
      return result;
    } catch {
      clientLogger.error(LogEvent.clientError, { operation, outcome: "error" });
      return null;
    }
  };

  const removeTag = (id: string) =>
    updateTagRelation(
      selectedTags.filter((tag) => tag.id !== id),
      "tag.remove",
    );

  const addTag = async (tag: PostTagOption) => {
    if (selectedTags.some((item) => item.id === tag.id)) return;
    const result = await updateTagRelation(
      [...selectedTags, { id: tag.id, name: tag.name }],
      "tag.add",
    );
    setInput("");
    setOpen(false);
    return result;
  };

  const createNewTag = async (name: string) => {
    try {
      const tag = await createTag({ name: { zh: name, en: name } });
      const relation = await addTag(tag);
      // A failed association is not a saved post; avoid a misleading or duplicate warning.
      if (relation !== null && relation?.publicSync !== "degraded") {
        notifyPublicSyncWarning(tag, toast.warning);
      }
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
