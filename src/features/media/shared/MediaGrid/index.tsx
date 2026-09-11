"use client";

import { Copy, File, Trash } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useCan } from "@/features/contracts/admin/use-current-user";
import { Permission } from "@/packages/identity/auth/permissions";
import type { MediaViewModel } from "../media-view-model";
import { Button } from "@/packages/ui/components/button";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { cn } from "@/packages/ui/lib/utils";

type MediaGridProps = {
  media?: MediaViewModel[];
  isLoading?: boolean;
  error?: string;
  currentItem?: MediaViewModel;
  onDelete: (id: string) => void;
  onSelect: (media: MediaViewModel) => void;
};

export function MediaGrid({
  media,
  isLoading,
  error,
  currentItem,
  onDelete,
  onSelect,
}: MediaGridProps) {
  const canDeleteMedia = useCan(Permission.mediaDelete);

  return (
    <div className="flex flex-wrap">
      {error && <p role="alert">{error}</p>}
      {isLoading && !media?.length && <p role="status">正在加载媒体...</p>}
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
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(item.url);
                  toast.success("已复制至剪切板");
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
                  onOK={() => onDelete(item.id)}
                />
              )}
            </div>
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
