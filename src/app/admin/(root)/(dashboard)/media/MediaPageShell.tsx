"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCan } from "@/app/admin/hooks/useCurrentUser";
import { Permission } from "@/packages/auth/permissions";
import type { MediaEntity } from "@/packages/trpc/api/modules/media/types/media.entity";
import { Button } from "@/packages/ui/components/button";
import { MediaGrid } from "./MediaGrid";
import { useMediaActions } from "./mediaActions";
import { useMediaQuery } from "./mediaQuery";

export interface MediaProps {
  onSelect?: (media: MediaEntity) => void;
}

export function MediaPageShell({ onSelect }: MediaProps) {
  const canUploadMedia = useCan(Permission.mediaUpload);
  const [currentItem, setCurrentItem] = useState<MediaEntity>();
  const onSelectRef = useRef(onSelect);
  const query = useMediaQuery();
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
      !query.hasMore ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          query.loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query.hasMore, query.loadMore]);

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
