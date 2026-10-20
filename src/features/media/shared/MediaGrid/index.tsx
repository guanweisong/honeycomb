"use client";

import { useRef, useState } from "react";
import { Copy, File, Trash } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useCan } from "@/features/user/admin/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import type {
  MediaManagementRecord,
  MediaRecord as MediaViewModel,
} from "@/features/media/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/Dialog";
import LoadingState from "@/components/LoadingState";
import { cn } from "@/lib/ui/utils";

type MediaGridProps = {
  media?: (MediaViewModel & Partial<MediaManagementRecord>)[];
  isLoading?: boolean;
  error?: string;
  currentItem?: MediaViewModel;
  onDelete: (id: string) => boolean | Promise<boolean>;
  onSelect: (media: MediaViewModel) => void;
  unavailableIds?: string[];
  onReconcile?: (id: string, acknowledgeUnknownReferences?: true) => unknown;
};

export function MediaGrid({
  media,
  isLoading,
  error,
  currentItem,
  onDelete,
  onSelect,
  onReconcile,
  unavailableIds = [],
}: MediaGridProps) {
  const canUploadMedia = useCan(Permission.mediaUpload);
  const pending = useRef(new Set<string>());
  const [working, setWorking] = useState<string[]>([]);
  const recover = async (id: string, deletion?: true) => {
    if (pending.current.has(id)) return false;
    pending.current.add(id);
    setWorking([...pending.current]);
    try {
      return (await onReconcile?.(id, deletion)) === true;
    } finally {
      pending.current.delete(id);
      setWorking([...pending.current]);
    }
  };
  const canDeleteMedia = useCan(Permission.mediaDelete);

  return (
    <div className="flex flex-wrap">
      {error && <p role="alert">{error}</p>}
      {isLoading && !media?.length && (
        <LoadingState variant="region" label="正在加载媒体..." />
      )}
      {media?.length ? (
        media.map((item) => (
          <div
            key={item.id}
            className={cn(
              "group relative w-48 m-1 border-2 bg-gray-100",
              item.id === currentItem?.id
                ? "border-blue-500"
                : "border-gray-100",
            )}
          >
            <button
              type="button"
              className="relative block w-full h-32 focus-visible:outline-2 focus-visible:outline-blue-500"
              disabled={
                unavailableIds.includes(item.id) ||
                (!!item.state && item.state !== "READY")
              }
              onClick={() => onSelect(item)}
              title={item.name}
              aria-label={`选择 ${item.name}`}
              aria-pressed={item.id === currentItem?.id}
            >
              {(!item.state || item.state === "READY") &&
              item.type?.includes("image") ? (
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
            {item.state && (
              <div className="p-2 text-xs break-words">
                <p>
                  {
                    {
                      UPLOADING: "上传待确认",
                      READY: "可使用",
                      DELETING: "删除待确认",
                      DELETED: "已删除",
                    }[item.state]
                  }
                </p>
                {item.state === "READY" && !item.verifiedAt && (
                  <p>历史媒体 · 未验证</p>
                )}
                {item.lastErrorCode && (
                  <p role="status">{item.lastErrorCode}</p>
                )}
                {item.lastAttemptAt && <p>上次尝试：{item.lastAttemptAt}</p>}
              </div>
            )}
            <div className="bg-black/40 flex flex-wrap items-center justify-center gap-2 text-white">
              {(!item.state || item.state === "READY") && (
                <Button
                  type="button"
                  aria-label={`复制 ${item.name} 的链接`}
                  disabled={unavailableIds.includes(item.id)}
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(item.url);
                    toast.success("已复制至剪切板");
                  }}
                >
                  <Copy />
                </Button>
              )}
              {canDeleteMedia && (!item.state || item.state === "READY") && (
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
              {onReconcile && item.state === "UPLOADING" && canUploadMedia && (
                <Button
                  disabled={working.includes(item.id)}
                  onClick={() => recover(item.id)}
                >
                  检查状态
                </Button>
              )}
              {onReconcile && item.state === "DELETING" && canDeleteMedia && (
                <Dialog
                  trigger={
                    <Button disabled={working.includes(item.id)}>
                      重试删除
                    </Button>
                  }
                  title="重试删除？"
                  description="正文和外部网站的链接无法完整检查。重试仍可能导致这些引用失效，确认继续吗？"
                  type="danger"
                  onOK={() => recover(item.id, true)}
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
