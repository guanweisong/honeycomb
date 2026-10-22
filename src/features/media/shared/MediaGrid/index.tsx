"use client";

import { useState } from "react";
import { Copy, File, Trash } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useCan } from "@/features/user/admin/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import type { MediaRecord as MediaViewModel } from "@/features/media/types/media.record";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/Dialog";
import LoadingState from "@/components/LoadingState";
import { cn } from "@/lib/ui/utils";

type MediaGridProps = {
  media?: MediaViewModel[];
  isLoading?: boolean;
  error?: string;
  currentItem?: MediaViewModel;
  onDelete: (id: string) => boolean | Promise<boolean>;
  onSelect: (media: MediaViewModel) => void;
  unavailableIds?: string[];
};

export function MediaGrid({
  media,
  isLoading,
  error,
  currentItem,
  onDelete,
  onSelect,
  unavailableIds = [],
}: MediaGridProps) {
  const [manualCopyId, setManualCopyId] = useState<string>();
  const canDeleteMedia = useCan(Permission.mediaDelete);

  return (
    <div className="flex flex-wrap">
      {error && <p role="alert">{error}</p>}
      {isLoading && !media?.length && (
        <LoadingState variant="region" label="正在加载媒体…" />
      )}
      {media?.length ? (
        media.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group relative w-32 h-32 m-1 border-2 bg-gray-100",
              item.id === currentItem?.id
                ? "border-blue-500"
                : "border-gray-100",
            )}
          >
            <button
              type="button"
              className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-blue-500"
              disabled={unavailableIds.includes(item.id)}
              onClick={() => onSelect(item)}
              title={item.name}
              aria-label={`选择 ${item.name}`}
              aria-pressed={item.id === currentItem?.id}
            >
              {item.type?.includes("image") ? (
                <Image
                  className="object-contain"
                  fill
                  sizes="128px"
                  src={item.url}
                  alt={item.name}
                />
              ) : (
                <File className="w-full h-full p-8 text-gray-400" />
              )}
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-black/40 opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex items-center justify-center space-x-2 text-white transition">
              <Button
                type="button"
                aria-label={`复制 ${item.name} 的链接`}
                disabled={unavailableIds.includes(item.id)}
                variant="secondary"
                onClick={async () => {
                  try {
                    if (!navigator.clipboard)
                      throw new Error("Clipboard unavailable");
                    await navigator.clipboard.writeText(item.url);
                    setManualCopyId(undefined);
                    toast.success("链接已复制");
                  } catch {
                    setManualCopyId(item.id);
                    toast.error("复制失败，请手动复制链接");
                  }
                }}
              >
                <Copy />
              </Button>
              {canDeleteMedia && (
                <Dialog
                  trigger={
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`删除 ${item.name}`}
                    >
                      <Trash />
                    </Button>
                  }
                  type="danger"
                  title="确定要删除吗？"
                  description="正文和外部网站的链接无法完整检查。删除可能导致这些引用失效，确认仍要删除吗？"
                  onOK={() => onDelete(item.id)}
                />
              )}
            </div>
            {manualCopyId === item.id && (
              <input
                className="absolute inset-x-0 top-0 w-full bg-white text-black"
                aria-label={`手动复制 ${item.name} 的链接`}
                value={item.url}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
            )}
          </div>
        ))
      ) : !isLoading && !error ? (
        <p role="status">暂无媒体</p>
      ) : null}
    </div>
  );
}
/**
 * 媒体网格组件，负责媒体列表展示和媒体选择交互。
 */
