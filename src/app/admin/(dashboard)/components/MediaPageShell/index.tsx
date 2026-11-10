"use client";

import { UploadCloud } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  useCan,
  useCurrentUser,
} from "@/app/admin/(dashboard)/providers/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import type { MediaRecord as MediaViewModel } from "@/features/media/types/media.record";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/LoadingState";
import { MediaGrid } from "@/app/admin/(dashboard)/media/components/MediaGrid";
import { useMediaActions } from "@/app/admin/(dashboard)/media/media-actions";
import { useMediaQuery } from "@/app/admin/(dashboard)/media/components/media-query";
import { MEDIA_MIME_TYPES } from "@/features/media/types/media.upload-policy";

export type MediaSelection = {
  currentItem: MediaViewModel | undefined;
  setCurrentItem: Dispatch<SetStateAction<MediaViewModel | undefined>>;
};

export function MediaPageShell({ selection }: { selection?: MediaSelection }) {
  const { user } = useCurrentUser();
  const scopeKey = user?.id ?? "signed-out";
  return selection ? (
    <MediaPanel key={scopeKey} scopeKey={scopeKey} selection={selection} />
  ) : (
    <StandaloneMediaPanel key={scopeKey} scopeKey={scopeKey} />
  );
}

function StandaloneMediaPanel({ scopeKey }: { scopeKey: string }) {
  const [currentItem, setCurrentItem] = useState<MediaViewModel>();
  return (
    <MediaPanel
      scopeKey={scopeKey}
      selection={{ currentItem, setCurrentItem }}
    />
  );
}

function MediaPanel({
  scopeKey,
  selection,
}: {
  scopeKey: string;
  selection: MediaSelection;
}) {
  const canUploadMedia = useCan(Permission.mediaUpload);
  const { currentItem, setCurrentItem } = selection;
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
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") {
      return;
    }

    let active = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (active && entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => {
      // disconnect 不撤回已排队的回调；旧面板不能继续命令共享查询。
      active = false;
      observer.disconnect();
    };
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
