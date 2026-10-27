"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCan, useCurrentUser } from "@/features/user/admin/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import type { MediaRecord as MediaViewModel } from "@/features/media/types/media.record";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/LoadingState";
import { MediaGrid } from "@/features/media/admin/components/MediaGrid";
import { useMediaActions } from "@/features/media/admin/media-actions";
import { useMediaQuery } from "@/features/media/admin/media-query";
import { MEDIA_MIME_TYPES } from "@/features/media/types/media.upload-policy";

export interface MediaProps {
  onSelect?: (media: MediaViewModel | undefined) => void;
}

export function MediaPageShell({ onSelect }: MediaProps) {
  const { user } = useCurrentUser();
  const callback = useRef(onSelect);
  useEffect(() => {
    callback.current = onSelect;
  }, [onSelect]);
  const previousAccount = useRef(user?.id);
  useEffect(() => {
    if (previousAccount.current !== user?.id) callback.current?.(undefined);
    previousAccount.current = user?.id;
  }, [user?.id]);
  return (
    <MediaPanel
      key={user?.id ?? "signed-out"}
      onSelect={onSelect}
      scopeKey={user?.id ?? "signed-out"}
    />
  );
}
function MediaPanel({ onSelect, scopeKey }: MediaProps & { scopeKey: string }) {
  const canUploadMedia = useCan(Permission.mediaUpload);
  const [currentItem, setCurrentItem] = useState<MediaViewModel>();
  const onSelectRef = useRef(onSelect);
  const hadSelection = useRef(false);
  const query = useMediaQuery();
  const { hasMore, loadMore } = query;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const actions = useMediaActions({
    refetch: query.refetch,
    scopeKey,
    selectionKey: currentItem?.id,
    onUploadComplete: setCurrentItem,
    onDeleteComplete: (id) =>
      setCurrentItem((current) => (current?.id === id ? undefined : current)),
  });
  const {
    fileInputRef,
    handleDelete,
    handleUpload,
    loading,
    failures,
    unavailableIds,
  } = actions;

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
              <LoadingState variant="inline" label="正在上传…" />
            ) : (
              "点击上传文件"
            )}
          </Button>
        </div>
      )}
      {failures.length > 0 && (
        <ul aria-label="本批上传结果">
          {failures.map((failure, index) => (
            <li key={`${failure.name}:${index}`}>
              {failure.name}: {failure.message}
            </li>
          ))}
        </ul>
      )}
      <MediaGrid
        media={query.data?.list}
        isLoading={query.isLoading}
        error={query.error}
        currentItem={currentItem}
        unavailableIds={unavailableIds}
        onDelete={handleDelete}
        onSelect={setCurrentItem}
      />
      {query.error && (
        <Button onClick={query.retry} disabled={query.isRetrying}>
          {query.data.list.length ? "加载更多失败，重试" : "加载失败，重试"}
        </Button>
      )}
      <div
        ref={loadMoreRef}
        data-testid="media-load-more-sentinel"
        aria-live="polite"
        className="flex min-h-8 items-center justify-center text-sm text-gray-500"
      >
        {query.isFetchingMore ? (
          <LoadingState
            variant="inline"
            label="正在加载更多…"
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
