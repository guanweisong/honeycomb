"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCan } from "@/features/user/admin/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import type { MediaRecord as MediaViewModel } from "@/features/media/types";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/LoadingState";
import { MediaGrid } from "../MediaGrid";
import { useMediaActions } from "../media-actions";
import { useMediaQuery } from "../media-query";
import { MEDIA_MIME_TYPES } from "../../upload-policy";

export interface MediaProps {
  onSelect?: (media: MediaViewModel | undefined) => void;
}

export function MediaPageShell({ onSelect }: MediaProps) {
  const canUploadMedia = useCan(Permission.mediaUpload);
  const [currentItem, setCurrentItem] = useState<MediaViewModel>();
  const onSelectRef = useRef(onSelect);
  const hadSelection = useRef(false);
  const query = useMediaQuery();
  const { hasMore, loadMore } = query;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const actions = useMediaActions({
    refetch: query.refetch,
    onUploadComplete: setCurrentItem,
    onDeleteComplete: (id) =>
      setCurrentItem((current) => (current?.id === id ? undefined : current)),
  });
  const { fileInputRef, handleDelete, handleUpload, loading } = actions;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (currentItem || hadSelection.current) onSelectRef.current?.(currentItem);
    hadSelection.current = currentItem !== undefined;
  }, [currentItem]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") {
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
            accept={MEDIA_MIME_TYPES.join(",")}
            hidden
            ref={fileInputRef}
            onChange={(event) => handleUpload(event.target.files)}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <UploadCloud />
            {loading ? (
              <LoadingState variant="inline" label="正在上传中..." />
            ) : (
              "点击上传文件"
            )}
          </Button>
        </div>
      )}
      <MediaGrid
        media={query.data?.list}
        isLoading={query.isLoading}
        error={query.error}
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
        {query.isFetchingMore ? (
          <LoadingState
            variant="inline"
            label="正在加载更多..."
            visuallyHiddenLabel
          />
        ) : !query.error && !query.hasMore && query.data?.list.length ? (
          "已加载全部媒体"
        ) : null}
      </div>
    </div>
  );
}
/**
 * 媒体管理页组件，负责媒体查询、上传、删除和选择流程。
 */
