"use client";

import { Copy, File, Trash } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useCan } from "@/features/contracts/admin/use-current-user";
import { Permission } from "@/packages/identity/auth/permissions";
import type { MediaEntity } from "@/packages/trpc/api/outputs";
import { Button } from "@/packages/ui/components/button";
import { Skeleton } from "@/packages/ui/components/skeleton";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { cn } from "@/packages/ui/lib/utils";

type MediaGridProps = {
  media?: MediaEntity[];
  currentItem?: MediaEntity;
  onDelete: (id: string) => void;
  onSelect: (media: MediaEntity) => void;
};

export function MediaGrid({
  media,
  currentItem,
  onDelete,
  onSelect,
}: MediaGridProps) {
  const canDeleteMedia = useCan(Permission.mediaDelete);

  return (
    <div className="flex flex-wrap">
      {media?.length ? (
        media.map((item) => (
          <div
            key={item.id}
            className={cn(
              "relative w-32 h-32 m-1 border-2 bg-gray-100 cursor-pointer",
              item.id === currentItem?.id
                ? "border-blue-500"
                : "border-gray-100",
            )}
            onClick={() => onSelect(item)}
            title={item.name as string}
          >
            {item.type?.includes("image") ? (
              <Image
                className="object-contain"
                fill
                sizes="7vw"
                src={item.url as string}
                alt={item.name as string}
              />
            ) : (
              <File className="w-full h-full p-8 text-gray-400" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center space-x-2 text-white transition">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(item.url!);
                  toast.success("已复制至剪切板");
                }}
              >
                <Copy />
              </Button>
              {canDeleteMedia && (
                <Dialog
                  trigger={
                    <Button variant="secondary">
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
      ) : (
        <div className="flex flex-wrap">
          {Array.from({ length: 100 }).map((_value, index) => (
            <Skeleton
              key={`media.skeleton${index}`}
              className="relative w-32 h-32 m-1 border-2 bg-gray-100 border-gray-100 rounded-none"
            />
          ))}
        </div>
      )}
    </div>
  );
}
/**
 * 媒体网格组件，负责媒体列表展示和媒体选择交互。
 */
