"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCan } from "@/features/contracts/admin/use-current-user";
import { Permission } from "@/packages/identity/auth/permissions";
import type { MediaEntity } from "@/packages/trpc/api/outputs";
import { Button } from "@/packages/ui/components/button";
import { MediaGrid } from "../MediaGrid";
import { useMediaActions } from "../actions/media-actions";
import { useMediaQuery } from "../queries/media-query";

export interface MediaProps {
  onSelect?: (media: MediaEntity) => void;
}

export function MediaPageShell({ onSelect }: MediaProps) {
  const canUploadMedia = useCan(Permission.mediaUpload);
  const [currentItem, setCurrentItem] = useState<MediaEntity>();
  const onSelectRef = useRef(onSelect);
  const query = useMediaQuery();
  const { hasMore, loadMore } = query;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const actions = useMediaActions({
    refetch: query.refetch,
    onUploadComplete: setCurrentItem,
    onDeleteComplete: () => setCurrentItem(undefined),
  });
  const { fileInputRef, handleDelete, handleUpload, loading } = actions;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (currentItem) onSelectRef.current?.(currentItem);
  }, [currentItem]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (
      !sentinel ||
      !hasMore ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div>
      {canUploadMedia && (
        <div className="flex m-1">
          <input
            type="file"
            multiple
            hidden
            ref={fileInputRef}
            onChange={(event) => handleUpload(event.target.files)}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <UploadCloud />
            {loading ? "正在上传中..." : "点击上传文件"}
          </Button>
        </div>
      )}
      <MediaGrid
        media={query.data?.list}
        currentItem={currentItem}
        onDelete={handleDelete}
        onSelect={setCurrentItem}
      />
      <div
        ref={loadMoreRef}
        data-testid="media-load-more-sentinel"
        aria-live="polite"
        className="flex min-h-8 items-center justify-center text-sm text-gray-500"
      >
        {query.isFetchingMore
          ? "正在加载更多..."
          : !query.hasMore && query.data?.list.length
            ? "已加载全部媒体"
            : null}
      </div>
    </div>
  );
}
/**
 * 媒体管理页组件，负责媒体查询、上传、删除和选择流程。
 */
