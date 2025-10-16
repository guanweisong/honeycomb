"use client";

import { Copy, File, Trash, UploadCloud } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { env } from "@honeycomb/env";

import { Button } from "@honeycomb/ui/components/button";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { Skeleton } from "@honeycomb/ui/components/skeleton";
import { cn } from "@honeycomb/ui/lib/utils";

import { trpc } from "@honeycomb/trpc/client/trpc";
import { MediaEntity } from "@honeycomb/validation/media/schemas/media.entity.schema";
import { MediaIndexInput } from "@honeycomb/validation/media/schemas/media.list.query.schema";

/**
 * 媒体库组件的属性接口。
 */
export interface MediaProps {
  /**
   * 当选择媒体文件时触发的回调函数。
   * @param {MediaEntity} media - 被选中的媒体实体。
   */
  onSelect?: (media: MediaEntity) => void;
}

/**
 * 媒体库组件。
 * 负责展示媒体文件列表，并提供上传、删除、选择等功能。
 * @param {MediaProps} { onSelect } - 组件属性，包含选择媒体文件的回调函数。
 * @returns {JSX.Element} 媒体库界面。
 */
const Media = ({ onSelect }: MediaProps) => {
  /**
   * 当前选中的媒体项。
   */
  const [currentItem, setCurrentItem] = useState<MediaEntity>();
  /**
   * 上传操作的加载状态。
   */
  const [loading, setLoading] = useState(false);
  /**
   * 文件输入框的引用，用于触发文件选择对话框。
   */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 媒体列表的查询参数。
   * 默认 `limit` 为 99999，以获取所有媒体文件。
   */
  const [searchParams] = useState<MediaIndexInput>({
    limit: 99999,
  });
  /**
   * 获取媒体列表数据的 tRPC 查询。
   * `data` 包含列表数据，`refetch` 用于手动重新获取数据。
   */
  const { data, refetch } = trpc.media.index.useQuery(searchParams);
  /**
   * 删除媒体文件的 tRPC mutation。
   * 用于执行删除操作。
   */
  const destroyMedia = trpc.media.destroy.useMutation();

  /**
   * 处理文件上传。
   * 将选中的文件通过 POST 请求上传到服务器，并处理上传结果。
   * @param {FileList | null} files - 用户选择的文件列表。
   */
  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    setLoading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("file", file);
    });

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_DOMAIN}/media`, {
        method: "POST",
        body: formData,
        headers: {
          "x-auth-token": localStorage.getItem("token") || "",
        },
      });
      const data = await response.json();

      if (response.ok) {
        toast.success("上传成功");
        setCurrentItem(data);
        refetch();
      } else {
        toast.error(data.message || "上传失败");
      }
    } catch (e) {
      toast.error("上传失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理文件删除。
   * 调用 `destroyMedia` mutation 删除指定 ID 的媒体文件，并刷新列表。
   * @param {string} id - 要删除的媒体文件 ID。
   */
  const handleDelete = async (id: string) => {
    try {
      const res = await destroyMedia.mutateAsync({ ids: [id] });
      if (res.success) {
        toast.success("删除成功");
        setCurrentItem(undefined);
        refetch();
      }
    } catch (e) {
      toast.error("删除失败");
    }
  };

  /**
   * 副作用钩子，用于在 `currentItem` 变化时触发 `onSelect` 回调。
   * 如果 `onSelect` 存在且 `currentItem` 有值，则调用 `onSelect`。
   */
  useEffect(() => {
    if (onSelect && currentItem) {
      onSelect(currentItem);
    }
  }, [currentItem]);

  return (
    <div>
      <div className="flex m-1">
        <input
          type="file"
          multiple
          hidden
          ref={fileInputRef}
          onChange={(e) => handleUpload(e.target.files)}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          <UploadCloud />
          {loading ? "正在上传中..." : "点击上传文件"}
        </Button>
      </div>
      <div className="flex flex-wrap">
        {data?.list?.length ? (
          data?.list?.map((item) => (
            <div
              key={item.id}
              className={cn(
                "relative w-32 h-32 m-1 border-2 bg-gray-100 cursor-pointer",
                item.id === currentItem?.id
                  ? "border-blue-500"
                  : "border-gray-100",
              )}
              onClick={() => setCurrentItem(item)}
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
                <Dialog
                  trigger={
                    <Button variant="secondary">
                      <Trash />
                    </Button>
                  }
                  type="danger"
                  title="确定要删除吗？"
                  onOK={() => handleDelete(item.id)}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-wrap">
            {Array.from({ length: 100 }).map(() => (
              <Skeleton className="relative w-32 h-32 m-1 border-2 bg-gray-100 border-gray-100 rounded-none" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Media;
